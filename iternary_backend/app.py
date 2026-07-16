from fastapi import FastAPI
import pandas as pd
import pickle
import math
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI()

# Load ML model files
vectorizer = pickle.load(open("vectorizer.pkl","rb"))
df = pickle.load(open("travel_data.pkl","rb"))
distance_df = pd.read_csv("distances.csv")


DISTANCE_ROW_COL = distance_df.columns[0]
DISTANCE_CITIES = [str(city).strip() for city in distance_df.columns[1:]]
DISTANCE_LOOKUP = {}

for _, row in distance_df.iterrows():
    from_city = str(row[DISTANCE_ROW_COL]).strip()
    DISTANCE_LOOKUP[from_city] = {}
    for to_city in DISTANCE_CITIES:
        value = row.get(to_city)
        if pd.notna(value):
            DISTANCE_LOOKUP[from_city][to_city] = float(value)


DAY_SLOTS = ["08:30", "10:30", "13:30", "15:30", "17:00"]
LUNCH_WINDOW_SLOTS = ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30"]
STAY_SLOT = "18:30"
MIN_ATTRACTIONS_PER_DAY = 3
MAX_ATTRACTIONS_PER_DAY = 5


def is_long_form_attraction(attraction):
    text = " ".join([
        str(attraction.get("Attraction_Name", "")),
        str(attraction.get("Category", "")),
        str(attraction.get("Interests_Tags", ""))
    ]).lower()
    keywords = ["safari", "national park", "wildlife park", "balloon", "trek", "hiking"]
    return any(keyword in text for keyword in keywords)


def is_national_park_attraction(attraction):
    text = " ".join([
        str(attraction.get("Attraction_Name", "")),
        str(attraction.get("Category", "")),
        str(attraction.get("Interests_Tags", ""))
    ]).lower()
    return "national park" in text


def get_duration_minutes(attraction):
    if is_long_form_attraction(attraction):
        return 240
    return 90


def time_to_minutes(time_text):
    hours, minutes = str(time_text).split(":")
    return int(hours) * 60 + int(minutes)


def is_visit_entry(item):
    place = str(item.get("place", "")).strip().lower()
    return place != "lunch" and not place.startswith("stay at ")


def get_distance_km(from_city, to_city):
    from_city = str(from_city).strip()
    to_city = str(to_city).strip()

    if from_city == to_city:
        return 0.0

    forward = DISTANCE_LOOKUP.get(from_city, {}).get(to_city)
    backward = DISTANCE_LOOKUP.get(to_city, {}).get(from_city)

    if forward is not None and backward is not None:
        return (forward + backward) / 2

    if forward is not None:
        return forward

    if backward is not None:
        return backward

    return 9999.0


def get_route_penalty(distance_km):
    if distance_km <= 80:
        return 0
    if distance_km <= 150:
        return 20
    if distance_km <= 220:
        return 60
    if distance_km <= 300:
        return 140
    return 260


def get_city_route_score(reference_city, candidate_city, city_scores):
    distance_km = get_distance_km(reference_city, candidate_city)
    relevance_score = city_scores.get(candidate_city, 0) * 1000
    distance_score = distance_km * 1.1
    penalty_score = get_route_penalty(distance_km)
    return distance_score + penalty_score - relevance_score


def get_sorted_nearby_cities(reference_city, city_pool):
    return sorted(
        [candidate for candidate in city_pool if candidate != reference_city],
        key=lambda candidate: get_distance_km(reference_city, candidate)
    )


def build_day_city_sequence(ranked_cities, deduped_city_groups, total_days):
    if not ranked_cities:
        return []

    city_day_counts = {city: 1 for city in ranked_cities}
    remaining_days = max(0, total_days - len(ranked_cities))

    city_extra_capacity = {
        city: max(0, math.ceil(len(deduped_city_groups.get(city, [])) / MIN_ATTRACTIONS_PER_DAY) - 1)
        for city in ranked_cities
    }

    for city in ranked_cities:
        if remaining_days <= 0:
            break

        extra_days = min(city_extra_capacity.get(city, 0), remaining_days)
        city_day_counts[city] += extra_days
        remaining_days -= extra_days

    city_priority = sorted(
        ranked_cities,
        key=lambda city: len(deduped_city_groups.get(city, [])),
        reverse=True
    )

    priority_index = 0
    while remaining_days > 0 and city_priority:
        city = city_priority[priority_index % len(city_priority)]
        city_day_counts[city] += 1
        remaining_days -= 1
        priority_index += 1

    day_city_sequence = []
    for city in ranked_cities:
        day_city_sequence.extend([city] * city_day_counts[city])

    return day_city_sequence[:total_days]


def get_city_attractions_from_index(city_name, deduped_city_groups, city_next_index):
    all_attractions = deduped_city_groups.get(city_name, [])
    if not all_attractions:
        return []

    start_index = city_next_index.get(city_name, 0)
    if start_index >= len(all_attractions):
        start_index = 0
        city_next_index[city_name] = 0

    return all_attractions[start_index:]

# Recommendation function
def recommend_attractions(city, interests, group_type, lifestyle, budget):

    user_input = f"{city} {interests} {group_type} {lifestyle}"

    user_vector = vectorizer.transform([user_input])

    similarity_scores = cosine_similarity(user_vector, vectorizer.transform(df["combined_features"]))

    df["score"] = similarity_scores[0]

    filtered = df[
        (df["Daily_Budget_USD_Min"] <= budget) &
        (df["Daily_Budget_USD_Max"] >= budget)
    ]

    if filtered.empty:
        filtered = df

    results = filtered.sort_values("score", ascending=False)

    return results


# itinerary generator
def generate_itinerary(city, interests, group_type, lifestyle, budget, days):

    results = recommend_attractions(city, interests, group_type, lifestyle, budget)

    itinerary = {}

    if results.empty:
        return {f"Day {d}": [] for d in range(1, days + 1)}

    city_groups = {}
    for _, row in results.iterrows():
        row_city = row["City"]
        city_groups.setdefault(row_city, []).append(row.to_dict())

    deduped_city_groups = {}
    for row_city, attractions in city_groups.items():
        seen_places = set()
        unique_attractions = []

        for attraction in attractions:
            place_name = str(attraction.get("Attraction_Name", "")).strip().lower()
            if not place_name or place_name in seen_places:
                continue

            seen_places.add(place_name)
            unique_attractions.append(attraction)

        deduped_city_groups[row_city] = unique_attractions

    city_scores = {}
    for _, row in results.iterrows():
        row_city = row["City"]
        row_score = float(row.get("score", 0))
        if row_city not in city_scores or row_score > city_scores[row_city]:
            city_scores[row_city] = row_score

    candidate_cities = [row_city for row_city in city_scores if deduped_city_groups.get(row_city)]

    ranked_cities = []
    current_city = city if city in candidate_cities else None

    if current_city is not None:
        ranked_cities.append(current_city)
        candidate_cities.remove(current_city)

    while candidate_cities:
        reference_city = ranked_cities[-1] if ranked_cities else city
        next_city = min(
            candidate_cities,
            key=lambda candidate: (
                get_city_route_score(reference_city, candidate, city_scores),
                get_distance_km(reference_city, candidate),
                -city_scores.get(candidate, 0)
            )
        )
        ranked_cities.append(next_city)
        candidate_cities.remove(next_city)

    if not ranked_cities:
        ranked_cities = [city]

    day_city_sequence = build_day_city_sequence(ranked_cities, deduped_city_groups, days)
    city_next_index = {row_city: 0 for row_city in deduped_city_groups}

    for d in range(1, days+1):
        day_city = day_city_sequence[d - 1] if d - 1 < len(day_city_sequence) else ranked_cities[-1]
        available_attractions = get_city_attractions_from_index(
            day_city,
            deduped_city_groups,
            city_next_index
        )

        day_plan = []
        day_hotels = []
        long_form_attractions = [a for a in available_attractions if is_long_form_attraction(a)]
        regular_attractions = [a for a in available_attractions if not is_long_form_attraction(a)]

        selected_attractions = []
        if long_form_attractions:
            selected_attractions.append(long_form_attractions[0])

        remaining_slots = MAX_ATTRACTIONS_PER_DAY - len(selected_attractions)
        selected_attractions.extend(regular_attractions[:remaining_slots])

        if len(selected_attractions) < MIN_ATTRACTIONS_PER_DAY:
            for attraction in regular_attractions:
                place_name = attraction.get("Attraction_Name")
                if place_name not in [item.get("Attraction_Name") for item in selected_attractions]:
                    selected_attractions.append(attraction)
                if len(selected_attractions) >= min(MIN_ATTRACTIONS_PER_DAY, len(available_attractions)):
                    break

        if len(selected_attractions) < MIN_ATTRACTIONS_PER_DAY and not selected_attractions:
            selected_attractions.extend(available_attractions[:MIN_ATTRACTIONS_PER_DAY])

        if len(selected_attractions) < MIN_ATTRACTIONS_PER_DAY:
            selected_place_names = {
                attraction.get("Attraction_Name") for attraction in selected_attractions
            }
            nearby_cities = get_sorted_nearby_cities(day_city, deduped_city_groups.keys())
            for nearby_city in nearby_cities:
                nearby_attractions = get_city_attractions_from_index(
                    nearby_city,
                    deduped_city_groups,
                    city_next_index
                )
                nearby_attractions = [
                    attraction for attraction in nearby_attractions
                    if attraction.get("Attraction_Name") not in selected_place_names
                    and not is_long_form_attraction(attraction)
                ]

                for attraction in nearby_attractions:
                    selected_attractions.append(attraction)
                    selected_place_names.add(attraction.get("Attraction_Name"))
                    if len(selected_attractions) >= MIN_ATTRACTIONS_PER_DAY:
                        break

                if len(selected_attractions) >= MIN_ATTRACTIONS_PER_DAY:
                    break

        selected_attractions = selected_attractions[:MAX_ATTRACTIONS_PER_DAY]
        lunch_added = False
        has_long_form_day = bool(selected_attractions and is_long_form_attraction(selected_attractions[0]))

        if has_long_form_day:
            primary_attraction = selected_attractions[0]
            hotels = [
                hotel.strip()
                for hotel in str(primary_attraction.get("Example_Hotels", "")).split(";")
                if hotel.strip()
            ]
            for hotel in hotels:
                if hotel not in day_hotels:
                    day_hotels.append(hotel)

            day_plan.append({
                "time": "08:30",
                "city": primary_attraction.get("City"),
                "place": primary_attraction.get("Attraction_Name"),
                "area": primary_attraction.get("Area"),
                "category": primary_attraction.get("Category"),
                "interests": primary_attraction.get("Interests_Tags"),
                "group_type": primary_attraction.get("Suitable_For_Group"),
                "lifestyle": primary_attraction.get("Lifestyle_Tags"),
                "budget_range_usd": {
                    "min": primary_attraction.get("Daily_Budget_USD_Min"),
                    "max": primary_attraction.get("Daily_Budget_USD_Max")
                },
                "suggested_stay_days": primary_attraction.get("Suggested_Stay_Days"),
                "duration_minutes": get_duration_minutes(primary_attraction),
                "hotels": hotels[:3]
            })

            day_plan.append({
                "time": "12:30",
                "city": day_city,
                "place": "Lunch"
            })
            lunch_added = True

            day_plan.append({
                "time": "13:30",
                "city": primary_attraction.get("City"),
                "place": f"Continue visiting {primary_attraction.get('Attraction_Name')}"
            })

            afternoon_slots = ["15:30", "17:00"]
            for slot, attraction in zip(afternoon_slots, selected_attractions[1:3]):
                hotels = [
                    hotel.strip()
                    for hotel in str(attraction.get("Example_Hotels", "")).split(";")
                    if hotel.strip()
                ]
                for hotel in hotels:
                    if hotel not in day_hotels:
                        day_hotels.append(hotel)

                day_plan.append({
                    "time": slot,
                    "city": attraction.get("City"),
                    "place": attraction.get("Attraction_Name"),
                    "area": attraction.get("Area"),
                    "category": attraction.get("Category"),
                    "interests": attraction.get("Interests_Tags"),
                    "group_type": attraction.get("Suitable_For_Group"),
                    "lifestyle": attraction.get("Lifestyle_Tags"),
                    "budget_range_usd": {
                        "min": attraction.get("Daily_Budget_USD_Min"),
                        "max": attraction.get("Daily_Budget_USD_Max")
                    },
                    "suggested_stay_days": attraction.get("Suggested_Stay_Days"),
                    "duration_minutes": get_duration_minutes(attraction),
                    "hotels": hotels[:3]
                })
        else:
            pre_lunch_slots = ["08:30", "10:30"]
            post_lunch_slots = ["13:30", "15:30", "17:00"]
            pre_lunch_attractions = selected_attractions[:2]
            post_lunch_attractions = selected_attractions[2:5]

            for slot, attraction in zip(pre_lunch_slots, pre_lunch_attractions):
                hotels = [
                    hotel.strip()
                    for hotel in str(attraction.get("Example_Hotels", "")).split(";")
                    if hotel.strip()
                ]
                for hotel in hotels:
                    if hotel not in day_hotels:
                        day_hotels.append(hotel)

                day_plan.append({
                    "time": slot,
                    "city": attraction.get("City"),
                    "place": attraction.get("Attraction_Name"),
                    "area": attraction.get("Area"),
                    "category": attraction.get("Category"),
                    "interests": attraction.get("Interests_Tags"),
                    "group_type": attraction.get("Suitable_For_Group"),
                    "lifestyle": attraction.get("Lifestyle_Tags"),
                    "budget_range_usd": {
                        "min": attraction.get("Daily_Budget_USD_Min"),
                        "max": attraction.get("Daily_Budget_USD_Max")
                    },
                    "suggested_stay_days": attraction.get("Suggested_Stay_Days"),
                    "duration_minutes": get_duration_minutes(attraction),
                    "hotels": hotels[:3]
                })

            lunch_time = "12:30" if len(pre_lunch_attractions) >= 2 else "13:00"
            day_plan.append({
                "time": lunch_time,
                "city": day_city,
                "place": "Lunch"
            })
            lunch_added = True

            for slot, attraction in zip(post_lunch_slots, post_lunch_attractions):
                hotels = [
                    hotel.strip()
                    for hotel in str(attraction.get("Example_Hotels", "")).split(";")
                    if hotel.strip()
                ]
                for hotel in hotels:
                    if hotel not in day_hotels:
                        day_hotels.append(hotel)

                day_plan.append({
                    "time": slot,
                    "city": attraction.get("City"),
                    "place": attraction.get("Attraction_Name"),
                    "area": attraction.get("Area"),
                    "category": attraction.get("Category"),
                    "interests": attraction.get("Interests_Tags"),
                    "group_type": attraction.get("Suitable_For_Group"),
                    "lifestyle": attraction.get("Lifestyle_Tags"),
                    "budget_range_usd": {
                        "min": attraction.get("Daily_Budget_USD_Min"),
                        "max": attraction.get("Daily_Budget_USD_Max")
                    },
                    "suggested_stay_days": attraction.get("Suggested_Stay_Days"),
                    "duration_minutes": get_duration_minutes(attraction),
                    "hotels": hotels[:3]
                })

        day_plan = sorted(day_plan, key=lambda item: time_to_minutes(item.get("time", "23:59")))

        stay_place = day_hotels[0] if day_hotels else f"{day_city} Central Hotel"
        day_plan.append({
            "time": STAY_SLOT,
            "city": day_city,
            "place": f"Stay at {stay_place}",
            "hotels": day_hotels[:3]
        })

        city_usage_counts = {}
        for attraction in selected_attractions:
            attraction_city = attraction.get("City")
            if attraction_city:
                city_usage_counts[attraction_city] = city_usage_counts.get(attraction_city, 0) + 1

        for attraction_city, used_count in city_usage_counts.items():
            city_next_index[attraction_city] = city_next_index.get(attraction_city, 0) + used_count

        itinerary[f"Day {d}"] = day_plan

    return itinerary


# API endpoint
@app.post("/generate-itinerary")
def generate(data: dict):

    city = data["city"]
    interests = data["interests"]
    group_type = data["group_type"]
    lifestyle = data["lifestyle"]
    budget = data["budget"]
    days = data["days"]

    itinerary = generate_itinerary(city, interests, group_type, lifestyle, budget, days)

    return {"itinerary": itinerary}
