import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
  ActivityIndicator
} from 'react-native';

import { Text, TextInput, Button, Chip, IconButton } from 'react-native-paper';
import { itineraryChatStyles as styles } from './itineraryChatStyles';

const width = Dimensions.get('window').width;

const DARK_BG = '#181C1F';
const BUBBLE_USER = '#20B2AA';
const BUBBLE_BOT = '#23282C';
const TEXT_USER = '#fff';
const TEXT_BOT = '#e0f7fa';
const INPUT_BG = '#23282C';
const CHIP_SELECTED = '#20B2AA55';

const experienceCityMap: Record<string, string[]> = {

"🏖 Beaches & Coastal Relaxation":[
"Arugam Bay","Batticaloa","Bentota","Hikkaduwa","Kalpitiya",
"Mannar","Matara","Mirissa","Negombo","Trincomalee"
],

"🏛 Culture & Ancient Heritage":[
"Anuradhapura","Dambulla","Jaffna","Kandy","Matale",
"Polonnaruwa","Sigiriya"
],

"⛰ Mountains & Scenic Hill Country":[
"Badulla","Ella","Matale","Nuwara Eliya"
],

"🌿 Nature & Wildlife":[
"Badulla","Hambantota","Kalpitiya","Matale","Trincomalee"
],

"🏄 Adventure & Surfing":[
"Arugam Bay","Ella","Hikkaduwa","Kalpitiya","Sigiriya"
],

"🏙 City Life & Urban Experiences":[
"Colombo","Galle","Jaffna","Kandy","Negombo"
],

"🌾 Rural & Local Experiences":[
"Badulla","Batticaloa","Hambantota","Mannar","Matale"
]

};

type Answers = {

experience:string
city:string
interests:string[]
group_type:string
lifestyle:string
budget:number
days:number

};

type ChatStep = {

key:keyof Answers
question:string
options?:string[]
inputType?:'number'

};

type ChatMessage = {

from:'bot'|'user'
text:string
typing?:boolean

};

const chatSteps:ChatStep[]=[

{
key:'experience',
question:'What type of experience are you looking for in your first day?',
options:Object.keys(experienceCityMap)
},

{
key:'city',
question:'Select the trip starting city'
},

{
key:'interests',
question:'What are your interests? (Select one or more)',
options:['Culture','Nature','Food','Relaxation','Adventure']
},

{
key:'group_type',
question:'What is your group type?',
options:['Solo','Couple','Family','Friends']
},

{
key:'lifestyle',
question:'What is your travel lifestyle?',
options:['Relaxed','Balanced','Active']
},

{
key:'budget',
question:'What is your daily budget per person (USD)? (100 - 200)',
inputType:'number'
},

{
key:'days',
question:'How many days is your trip? (5 - 30)',
inputType:'number'
}

]

export default function ItineraryChat({onResult,onBack}:any){

const[step,setStep]=useState(0)
const[input,setInput]=useState('')
const[answers,setAnswers]=useState<Partial<Answers>>({interests:[]})
const[chat,setChat]=useState<ChatMessage[]>([
{from:'bot',text:chatSteps[0].question}
])

const[cityOptions,setCityOptions]=useState<string[]>([])
const[loading,setLoading]=useState(false)
const[inputVisible,setInputVisible]=useState(true)

const current=chatSteps[step]

const handleReset=()=>{
setStep(0)
setInput('')
setAnswers({interests:[]})
setChat([{from:'bot',text:chatSteps[0].question}])
setCityOptions([])
setLoading(false)
setInputVisible(true)
}

const botTyping=async(nextQuestion:string)=>{

setChat(prev=>[...prev,{from:'bot',text:'',typing:true}])

setTimeout(()=>{

setChat(prev=>{
const updated=[...prev]
updated.pop()
updated.push({from:'bot',text:nextQuestion})
return updated
})

},1000)

}

const handleSend=async(value:any)=>{

setInputVisible(false)

let newAnswers={...answers}

if(current.key==='experience'){

newAnswers.experience=value
setCityOptions(experienceCityMap[value])

}

else if(current.key==='city'){

newAnswers.city=value

}

else if(current.key==='interests'){

newAnswers.interests=value

}

else if(current.inputType==='number'){
  const num = parseInt(value)
  if (isNaN(num)) return

  // Enforce budget range 100-200
  if (current.key === 'budget') {
    if (num < 100 || num > 200) {
      setChat(prev => [
        ...prev,
        { from: 'bot', text: 'Please enter a budget between $100 and $200.' }
      ])
      setInputVisible(true)
      return
    }
  }

  // Enforce trip length range 5-30 days
  if (current.key === 'days') {
    if (num < 5 || num > 30) {
      setChat(prev => [
        ...prev,
        { from: 'bot', text: 'Please enter a trip duration between 5 and 30 days.' }
      ])
      setInputVisible(true)
      return
    }
  }

  ;(newAnswers as any)[current.key] = num
}

else{

;(newAnswers as any)[current.key]=value

}

setAnswers(newAnswers)

setChat(prev=>[
...prev,
{from:'user',text:Array.isArray(value)?value.join(', '):value}
])

setInput('')
setInputVisible(true)

if(step<chatSteps.length-1){

const nextStep=step+1
setStep(nextStep)

let nextQuestion=chatSteps[nextStep].question

await botTyping(nextQuestion)

}

else{

setLoading(true)

const res=await fetch('http://192.168.8.187:8000/generate-itinerary',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({

city:newAnswers.city,
interests:(newAnswers.interests||[]).join(', '),
group_type:newAnswers.group_type,
lifestyle:newAnswers.lifestyle,
budget:newAnswers.budget,
days:newAnswers.days

})
})

const data=await res.json()

setChat(prev=>[
...prev,
{from:'bot',text:'Generating your itinerary...'}
])

onResult(data.itinerary,newAnswers.city,newAnswers.days)

setLoading(false)

}

}

const toggleInterest=(interest:string)=>{

let selected=(answers.interests as string[])||[]

if(selected.includes(interest))
selected=selected.filter(i=>i!==interest)
else
selected=[...selected,interest]

setAnswers({...answers,interests:selected})

}

const renderInput=()=>{

if(!inputVisible) return null

if(current.key==='city'){

return(

<View style={styles.buttonWrap}>

{cityOptions.map(city=>(

<Button
key={city}
mode="contained"
onPress={()=>handleSend(city)}
style={styles.optionButton}
buttonColor={BUBBLE_USER}
>

{city}

</Button>

))}

</View>

)

}

if(current.key==='interests'){

return(

<View style={styles.chipWrap}>

{current.options?.map(opt=>(

<Chip
key={opt}
selected={(answers.interests as string[])?.includes(opt)}
onPress={()=>toggleInterest(opt)}
style={styles.chip}
textStyle={{color:'#fff'}}
>

{opt}

</Chip>

))}

<Button
mode="contained"
onPress={()=>handleSend(answers.interests)}
buttonColor={BUBBLE_USER}
>

Next

</Button>

</View>

)

}

if(current.options){

return(

<View style={styles.buttonWrap}>

{current.options.map(opt=>(

<Button
key={opt}
mode="contained"
onPress={()=>handleSend(opt)}
style={styles.optionButton}
buttonColor={BUBBLE_USER}
>

{opt}

</Button>

))}

</View>

)

}

return(

<View style={styles.inputRow}>

<TextInput
style={styles.textInput}
value={input}
onChangeText={setInput}
placeholder="Type here..."
placeholderTextColor="#aaa"
keyboardType={current.inputType==='number'?'numeric':'default'}
theme={{colors:{text:'#fff',background:INPUT_BG}}}
/>

<Button
mode="contained"
onPress={()=>handleSend(input)}
buttonColor={BUBBLE_USER}
>

Send

</Button>

</View>

)

}

return(

<KeyboardAvoidingView
style={{flex:1,backgroundColor:DARK_BG}}
behavior={Platform.OS==='ios'?'padding':undefined}
keyboardVerticalOffset={80}
>

<View style={{flex:1}}>

<View style={styles.headerContainer}>

<IconButton
icon="arrow-left"
size={26}
onPress={onBack}
iconColor="#fff"
/>

<Text style={styles.headerTitle}>
Sri-TriTuner
</Text>

<Button
mode="text"
onPress={handleReset}
textColor="#20B2AA"
style={styles.resetButton}
disabled={loading}
>
Regenerate
</Button>

</View>

<FlatList
data={chat}
keyExtractor={(_,i)=>i.toString()}
renderItem={({item})=>(

<View
style={[
styles.bubble,
item.from==='user'?styles.userBubble:styles.botBubble,
item.from==='user'
?{alignSelf:'flex-end',marginLeft:width*0.15}
:{alignSelf:'flex-start',marginRight:width*0.15}
]}
>

{item.typing?(
<ActivityIndicator color="#fff"/>
):(
<Text
style={{
color:item.from==='user'?TEXT_USER:TEXT_BOT,
fontSize:16
}}
>
{item.text}
</Text>
)}

</View>

)}
contentContainerStyle={{padding:18,paddingBottom:120}}
showsVerticalScrollIndicator={false}
/>

<View style={styles.inputBarContainer}>
{renderInput()}
</View>

</View>

</KeyboardAvoidingView>

)

}
