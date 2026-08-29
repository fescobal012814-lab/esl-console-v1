import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Users, Plus, Trash2, Check, X, Copy, ChevronLeft, ChevronRight, Pencil, CalendarDays, TrendingUp, FileText, LogOut, Sparkles, Download } from 'lucide-react';
import { supabase } from './supabaseClient.js';

/* ---------------- constants ---------------- */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DISPLAY_TZ_OPTIONS = [
  { id: 'ph', label: 'Philippines', tz: 'Asia/Manila' },
  { id: 'china', label: 'China', tz: 'Asia/Shanghai' },
  { id: 'israel', label: 'Israel', tz: 'Asia/Jerusalem' },
  { id: 'poland', label: 'Poland', tz: 'Europe/Warsaw' },
];

const CATEGORY_META = {
  company: { label: 'Company', color: '#5FB8BD' },
  private: { label: 'Private', color: '#C98BD0' },
  family: { label: 'Family', color: '#8FC98F' },
};

const PALETTE = ['#5FB8BD', '#C98BD0', '#8FC98F', '#E8A33D', '#7C9FD9', '#D98B8B', '#B7C98F', '#8FC9C0', '#D9B36B', '#A88FD9'];

const INK = '#0F1B2A';
const PAPER = '#16273A';
const PAPER_LIGHT = '#1D3149';
const PAPER_LIGHTER = '#243B57';
const ACCENT = '#E8A33D';
const TEXT = '#EAF0F6';
const MUTED = '#8CA0B3';
const BORDER = '#26405C';
const RED = '#E38080';

const COST = { scheduled: 0, finished: 1, cancelled: 0, absent: 0.5 };
const STATUS_META = {
  scheduled: { label: 'Scheduled', color: MUTED },
  finished: { label: 'Finished', color: '#7FCB7F' },
  cancelled: { label: 'Cancelled', color: MUTED },
  absent: { label: 'Absent/Late', color: RED },
};

const SKILLS = [
  { key: 'engagement', en: 'Class Engagement', zh: '课堂参与' },
  { key: 'speaking', en: 'Speaking', zh: '口语' },
  { key: 'listening', en: 'Listening', zh: '听力' },
  { key: 'reading', en: 'Reading', zh: '阅读' },
  { key: 'comprehension', en: 'Comprehension', zh: '理解力' },
  { key: 'vocabulary', en: 'Vocabulary', zh: '词汇' },
  { key: 'grammar', en: 'Grammar', zh: '语法' },
  { key: 'pronunciation', en: 'Pronunciation', zh: '发音' },
];
const TIER_LABELS = { 1: 'Needs Improvement', 2: 'Good', 3: 'Very Good', 4: 'Excellent' };

const TIME_FILTERS = [
  { id: 'all', label: 'All day', ranges: [[0, 1440]] },
  { id: 'morning', label: 'Morning', ranges: [[360, 720]] },
  { id: 'afternoon', label: 'Afternoon', ranges: [[720, 1080]] },
  { id: 'evening', label: 'Evening', ranges: [[1080, 1440]] },
  { id: 'graveyard', label: 'Graveyard', ranges: [[0, 360]] },
];

const CEFR_LEVELS = [
  { min: 0, max: 100, label: 'Pre-Beginner (A0)', bucket: 'beginner', objectives: 'Basic greetings, numbers, colors, shapes, and simple vocabulary related to everyday objects.' },
  { min: 101, max: 300, label: 'Beginner (A1)', bucket: 'beginner', objectives: 'Simple sentence structures, basic grammar rules (present simple, present continuous, past simple), vocabulary related to family, hobbies, shopping, and personal information.' },
  { min: 301, max: 500, label: 'Upper Beginner (A2-B1)', bucket: 'beginner', objectives: 'More complex sentence structures, expanded vocabulary, basic question forms, and simple conversations on familiar topics.' },
  { min: 501, max: 700, label: 'Pre-Intermediate (B1)', bucket: 'intermediate', objectives: 'More advanced grammar structures (past continuous, present perfect, future tense), wider range of vocabulary, ability to express opinions and preferences.' },
  { min: 701, max: 800, label: 'Intermediate (B2)', bucket: 'intermediate', objectives: 'Advanced grammar structures (conditionals, passive voice), more complex vocabulary, ability to understand and use idiomatic expressions.' },
  { min: 801, max: 900, label: 'Upper Intermediate (C1)', bucket: 'upper', objectives: 'Advanced grammar and vocabulary, ability to understand and use complex language, ability to express nuanced opinions and ideas.' },
  { min: 901, max: 1000, label: 'Advanced (C2)', bucket: 'upper', objectives: 'Mastery of English grammar and vocabulary, ability to understand and use complex language with ease, ability to express themselves with precision and nuance.' },
];
function levelForScore(score) {
  return CEFR_LEVELS.find((l) => score >= l.min && score <= l.max) || CEFR_LEVELS[CEFR_LEVELS.length - 1];
}
function nextLevelInfo(average) {
  const idx = CEFR_LEVELS.findIndex((l) => average >= l.min && average <= l.max);
  if (idx < 0 || idx === CEFR_LEVELS.length - 1) return null;
  const next = CEFR_LEVELS[idx + 1];
  const pointsNeeded = Math.round((next.min - average) * 10) / 10;
  const estLessons = Math.max(1, Math.ceil(pointsNeeded / 5));
  const estHours = Math.round((estLessons * 25 / 60) * 10) / 10;
  return { next, pointsNeeded, estLessons, estHours };
}
const ASSESSMENT_SKILLS = [
  { key: 'vocabulary', label: 'Vocabulary' },
  { key: 'pronunciation', label: 'Pronunciation' },
  { key: 'speaking', label: 'Speaking' },
  { key: 'listening', label: 'Listening' },
  { key: 'grammar', label: 'Grammar' },
];


// 3 phrase choices per skill, per overall lesson level (1=Needs Improvement...4=Excellent), per Set (1-3),
// written separately per age bracket. Set 1/2/3 are just extra variety, not different tones.
const COMMENT_SETS = { 1: 'Set 1', 2: 'Set 2', 3: 'Set 3' };
const PHRASE_VARIANTS = {
  kid: {
    speaking: {
      1: { 1: ["Talking out loud is still pretty tricky and needs lots of practice.", "Had a hard time saying full sentences today.", "Needed lots of help to speak up in class.", "Needs more practice putting words together out loud.", "Speaking is something we're still building up together."], 2: ["Speaking is still really tough right now \u2014 needs lots of gentle practice.", "Struggled to get words out today, even simple ones.", "Talking out loud is still a big challenge for now.", "Talking out loud still needs a lot of encouragement.", "Still working on saying more than a few words at a time."], 3: ["Speaking still needs a lot of support \u2014 let's keep trying together!", "Was quiet a lot today, needs more practice speaking up.", "Finding it hard to speak without lots of help right now.", "Speaking up is still hard, but that's okay, we'll keep going.", "Needed lots of prompting to try speaking today."] },
      2: { 1: ["Speaking is getting better, just a little shy sometimes.", "Did a nice job trying to talk today, even with some help.", "Getting braver about speaking up in class!", "Speaking a little more each time, nice progress!", "Trying out new words when talking, great effort!"], 2: ["Speaking is getting a little braver each lesson!", "Trying harder to talk out loud, nice effort today!", "Starting to speak up more without as much help.", "A bit more confident with talking today!", "Speaking up more than last time, well done!"], 3: ["Doing better with talking today, keep it up!", "Spoke a bit more today \u2014 proud of the effort!", "Getting more comfortable using English out loud.", "Getting more comfortable saying things out loud!", "Making good steps with speaking lately!"] },
      3: { 1: ["Spoke up with lots of confidence today!", "Did great in back-and-forth conversation!", "Talked clearly for most of the lesson \u2014 nice job!", "Spoke up confidently during today's activities!", "Really enjoyed hearing this student talk today!"], 2: ["Talked with a lot of confidence today \u2014 great job!", "Loved how much this student spoke up today!", "Chatting away happily during most of the lesson!", "Talked with lots of confidence in today's lesson!", "Speaking sounded really natural today, great job!"], 3: ["Spoke really well today, sounding more and more natural!", "Did a great job joining in conversations today!", "Speaking is really coming along nicely \u2014 awesome work!", "Did wonderfully with speaking today, well done!", "Spoke clearly and happily throughout the lesson!"] },
      4: { 1: ["Spoke fluently and confidently the whole lesson \u2014 amazing!", "Shared ideas clearly and naturally, no hesitation at all!", "Wow, barely needed any help talking today!", "Speaking today was absolutely fantastic, wow!", "Talked with total confidence the whole lesson!"], 2: ["Wow, talked so confidently the whole time today!", "Speaking was amazing today, like a natural!", "This student spoke beautifully all lesson long!", "Amazing speaking today, sounded so natural!", "This student's speaking today was outstanding!"], 3: ["Speaking today was superstar level \u2014 incredible job!", "Talked so easily and clearly the whole lesson!", "This was the best speaking lesson yet, amazing!", "Speaking today couldn't have been better, incredible!", "Talked beautifully and confidently all lesson long!"] },
    },
    listening: {
      1: { 1: ["Had trouble following what was said today.", "Needed things repeated a few times to understand.", "Found it tricky to catch all the words today.", "Following along is still tough, but we'll keep practicing.", "Needed a lot of help catching what was said today."], 2: ["Still working hard to understand what's being said.", "Needed things repeated a lot today to understand.", "Listening is tricky right now, but we'll keep practicing!", "Understanding spoken words is still a big challenge.", "Needed things repeated many times today."], 3: ["Had a hard time understanding today, needs more practice.", "Listening is still a big challenge right now.", "Needed lots of help understanding what was said.", "Listening carefully is still something we're working on.", "Had trouble catching the words during today's lesson."] },
      2: { 1: ["Getting better and better at listening!", "Understood most things with just a few repeats.", "Picking up more key words when listening now.", "Catching more words when listening these days!", "Needed fewer repeats today, nice improvement!"], 2: ["Getting better at understanding what's said \u2014 nice progress!", "Listening is improving little by little!", "Doing well catching more words each lesson!", "Listening a little better each lesson, great job!", "Understanding more of what's said now!"], 3: ["Understood a lot more today \u2014 great listening!", "Following along better and better each time!", "Listening skills are really growing nicely!", "Making good progress with listening lately!", "Picking up more details when listening now!"] },
      3: { 1: ["Followed along really well today!", "Understood instructions quickly \u2014 awesome!", "Picked up on lots of details while listening.", "Followed along really well during today's lesson!", "Listening skills are looking great these days!"], 2: ["Understood almost everything today \u2014 awesome listening!", "Really great at following along today!", "Listening was strong all through the lesson!", "Caught almost everything said today, awesome!", "Listening was strong throughout the whole lesson!"], 3: ["Listened so well today, barely needed any help!", "Understanding everything really quickly today \u2014 awesome!", "Listening skills are looking really strong now!", "Did a wonderful job listening today!", "Understood so much without needing repeats!"] },
      4: { 1: ["Understood everything with total ease today!", "Followed fast talking without any trouble!", "Excellent listening the whole lesson!", "Listening today was absolutely perfect, wow!", "Caught every single word with total ease!"], 2: ["Understood everything today, like a listening champion!", "Amazing listening today \u2014 nothing was missed!", "Perfect listening all lesson long, wow!", "Amazing listening all lesson long today!", "This student's listening was outstanding today!"], 3: ["Listening was incredible today \u2014 understood every single word!", "Such amazing listening skills today, well done!", "Nothing gets past this student's ears today!", "Listening today couldn't have been better!", "Understood everything effortlessly the whole lesson!"] },
    },
    reading: {
      1: { 1: ["Reading new words is still tricky right now.", "Reading is slow and needs more help.", "Found it hard to sound out new words today.", "Sounding out new words is still hard right now.", "Needs a lot of help getting through the words today."], 2: ["Reading is still tricky, needs lots more practice.", "Sounding out words is still hard right now.", "Needs a lot of help reading today.", "Reading is still slow, but we'll keep practicing.", "Needed lots of help with today's reading."], 3: ["Had trouble reading today, let's keep practicing.", "Reading is still a challenge right now.", "Needed lots of help with today's words.", "Words are still tricky to read right now.", "Reading needs more time and practice together."] },
      2: { 1: ["Reading is getting better with practice!", "Read most of it with a little help.", "Getting better at sounding out new words!", "Reading a bit more smoothly these days!", "Sounding out words more easily now!"], 2: ["Getting better at reading \u2014 nice improvement!", "Sounding out more words correctly now!", "Reading is coming along little by little!", "Making nice progress with reading lately!", "Getting through more words on their own now!"], 3: ["Read pretty well today, great job!", "Understanding more of the story today!", "Reading skills are really growing!", "Reading skills improving little by little!", "Doing better with tricky words today!"] },
      3: { 1: ["Read with great confidence today!", "Handled today's reading really well!", "Good reading and understanding throughout!", "Read through today's passage really nicely!", "Reading confidence is really growing well!"], 2: ["Read really well today, awesome work!", "Understood the story really well today!", "Reading is looking strong these days!", "Did a great job reading today, well done!", "Reading was smooth and clear today!"], 3: ["Reading is really strong now, amazing job!", "Barely needed help reading today, so proud!", "Reading skills are getting really impressive!", "Reading skills are looking really strong lately!", "Handled today's story really well!"] },
      4: { 1: ["Read fluently and even caught the tricky details!", "Excellent understanding of today's reading!", "Read like a natural \u2014 wonderful job!", "Reading today was absolutely wonderful, wow!", "Read through everything with total ease!"], 2: ["Reading like a superstar today, wow!", "Understood everything in the story, amazing!", "Perfect reading today, so impressive!", "Amazing reading all through the lesson today!", "This student's reading today was fantastic!"], 3: ["Reading today was incredible, top marks!", "Such a great reader today, well done!", "Nothing tricky about today's reading, amazing job!", "Reading today couldn't have gone better!", "Read beautifully and confidently the whole time!"] },
    },
    comprehension: {
      1: { 1: ["Still has a hard time understanding the story or lesson today.", "Needed a lot of help figuring out what things meant today.", "Found it tricky to explain what happened in the story.", "Struggled to answer questions about what we read or heard.", "Understanding the meaning behind the words is still tough right now."], 2: ["Understanding the story is still really hard right now.", "Needed lots of help knowing what the words meant.", "Couldn't quite explain what the story was about today.", "Had trouble answering questions about today's story.", "Making sense of what we read is still tricky."], 3: ["Figuring out what things mean is still a big challenge.", "Needed a lot of support understanding today's story.", "Wasn't sure what happened in the story today.", "Answering questions about the story was hard today.", "Understanding is still something we're working on together."] },
      2: { 1: ["Getting better at understanding what stories and lessons mean!", "Could explain some parts of what happened today.", "Answered a few questions about the story correctly!", "Understanding is growing bit by bit, nice job!", "Starting to get the main idea more often now."], 2: ["Understanding is improving little by little, great effort!", "Explained part of the story pretty well today.", "Got a few story questions right today!", "Making good progress understanding what we read and hear.", "Picking up the main idea more easily now."], 3: ["Doing better with understanding stories lately, nice work!", "Could tell me a bit about what happened today.", "Answered some questions about the story correctly.", "Understanding skills are coming along nicely.", "Getting the hang of the main idea more often."] },
      3: { 1: ["Understood the story really well today, great job!", "Could explain what happened without much help!", "Answered most questions about the story correctly!", "Really getting the meaning behind what we read and heard!", "Understanding is looking strong these days!"], 2: ["Really understood today's story, awesome job!", "Explained what happened pretty much on their own!", "Got most of the story questions right today!", "Getting the deeper meaning really well now!", "Understanding skills are looking great lately!"], 3: ["Grasped today's story well, wonderful work!", "Told me what happened with barely any help!", "Answered nearly all the story questions correctly!", "Picking up on what things really mean now!", "Understanding is really solid these days!"] },
      4: { 1: ["Understood everything today, like a comprehension superstar!", "Explained the whole story perfectly, amazing job!", "Answered every question about the story correctly!", "Really gets the deeper meaning of things now, wow!", "Understanding was perfect today, incredible work!"], 2: ["Understood every bit of today's story, superstar work!", "Explained the whole thing perfectly without any help!", "Got every single story question right, amazing!", "Really understands the deeper meaning now, fantastic!", "Today's understanding was flawless, incredible job!"], 3: ["Nailed understanding everything today, true superstar!", "Explained the full story with zero mistakes!", "Answered all the questions perfectly, wow!", "Picking up on every little detail and meaning now!", "Understanding today was simply amazing!"] },
    },
    vocabulary: {
      1: { 1: ["New words are still tricky and need more practice.", "Had trouble remembering recent words today.", "Needs more practice with new words.", "Learning new words is still tricky right now.", "Needs more time to remember new words."], 2: ["Still learning lots of new words, keep going!", "Vocabulary is still pretty small right now.", "Needs more practice remembering new words.", "New words are still hard to remember today.", "Needs lots of repeating to learn new words."], 3: ["Forgetting a lot of words today, needs practice.", "Still working on remembering new words.", "Needs lots of help with vocabulary right now.", "Building up new words takes more practice.", "Still working hard on remembering words."] },
      2: { 1: ["Learning new words steadily \u2014 nice work!", "Picking up new words, just needs more practice.", "Used a few new words correctly today!", "Remembering a few more words each time!", "New words are sticking a little better now!"], 2: ["Learning more new words each lesson!", "Remembering more vocabulary now, nice job!", "Vocabulary is growing bit by bit!", "Learning words at a nice steady pace!", "Trying out new words more often now!"], 3: ["Used some great new words today!", "Vocabulary is really building up nicely!", "Remembering words really well today!", "Word bank is growing bit by bit!", "Doing better remembering new words lately!"] },
      3: { 1: ["Has a really solid set of words to use!", "Used new words correctly and naturally today!", "Remembered lots of recently learned words!", "Used lots of good words today, nice job!", "Vocabulary is really coming along well!"], 2: ["Great vocabulary today, using lots of words!", "Really strong with words today, awesome!", "Vocabulary is looking really solid now!", "Great job with new words today!", "Remembering words really well these days!"], 3: ["Vocabulary is really impressive now, great job!", "Using so many words correctly today!", "Word skills are getting really strong!", "Word skills are looking really solid now!", "Used today's words really confidently!"] },
      4: { 1: ["Uses lots of great words \u2014 impressive!", "Amazing range of words for this level!", "Used big words naturally and correctly!", "Vocabulary today was absolutely amazing, wow!", "Used so many great words with ease!"], 2: ["Amazing vocabulary today, like a word wizard!", "Using so many great words, wow!", "Vocabulary today was outstanding, amazing job!", "This student's word skills today were fantastic!", "Amazing vocabulary all through the lesson!"], 3: ["Vocabulary today was superstar level, incredible!", "Such great word skills today, well done!", "Amazing job using tricky words today!", "Vocabulary today couldn't have been better!", "Used words beautifully and confidently today!"] },
    },
    grammar: {
      1: { 1: ["Sentence building is still tricky right now.", "Grammar needs lots of practice.", "Found today's sentence patterns hard to use.", "Sentences are still tricky to put together.", "Needs more practice with grammar right now."], 2: ["Grammar is still tricky, let's keep practicing!", "Making lots of grammar mistakes today, that's okay!", "Grammar needs more practice right now.", "Grammar mix-ups happened quite a bit today.", "Still learning how sentences fit together."], 3: ["Grammar mix-ups happened a lot today.", "Sentences are still tricky to build right now.", "Needs lots of help with grammar today.", "Building sentences takes more practice still.", "Needs lots of help with grammar today."] },
      2: { 1: ["Grammar is getting better, just still a bit mixed up sometimes.", "Got grammar right some of the time today!", "Making steady progress with sentences!", "Sentences are sounding a little better now!", "Making fewer grammar mix-ups these days!"], 2: ["Grammar is getting better bit by bit!", "Fewer mix-ups with sentences today, nice job!", "Grammar is slowly improving, keep going!", "Grammar is improving little by little!", "Getting the hang of sentences more now!"], 3: ["Grammar was pretty good today, well done!", "Sentences are sounding better and better!", "Grammar skills are really coming along!", "Doing better putting sentences together lately!", "Grammar skills are coming along nicely!"] },
      3: { 1: ["Used grammar correctly most of the time!", "Did really well with today's grammar point!", "Good sentence building today!", "Built really nice sentences today, well done!", "Grammar is looking pretty solid now!"], 2: ["Great grammar today, sentences sound awesome!", "Really good with grammar today, well done!", "Grammar is looking really solid now!", "Great job with sentences today!", "Grammar skills are really coming along well!"], 3: ["Grammar is really impressive now, amazing job!", "Sentences sound so good today, great work!", "Grammar skills are getting really strong!", "Sentences sounded really good today!", "Grammar is looking really strong lately!"] },
      4: { 1: ["Excellent command of grammar today!", "Used tricky sentence patterns correctly!", "Grammar was spot-on the whole lesson!", "Grammar today was absolutely amazing, wow!", "Built perfect sentences with total ease!"], 2: ["Amazing grammar today, like a grammar star!", "Perfect sentences all lesson long, wow!", "Grammar today was outstanding, incredible job!", "This student's grammar today was fantastic!", "Amazing sentences all through the lesson!"], 3: ["Grammar today was superstar level, incredible!", "Such great sentences today, well done!", "Amazing job with grammar today!", "Grammar today couldn't have been better!", "Sentences were beautiful and correct today!"] },
    },
    pronunciation: {
      1: { 1: ["Some sounds are still tricky to say clearly.", "A few words were hard to understand today.", "Found today's sounds tricky to make.", "Some sounds are still tricky to say right now.", "Needs more practice saying tricky sounds."], 2: ["Sounds are still tricky, let's keep practicing!", "Some words are hard to say right now.", "Pronunciation needs more practice today.", "Words are still hard to pronounce clearly today.", "Needs lots of practice with sounds today."], 3: ["Hard to understand some words today, that's okay.", "Sounds are still tricky right now.", "Needs lots of help with pronunciation today.", "Saying words clearly takes more practice still.", "Needs lots of help with sounds today."] },
      2: { 1: ["Getting clearer with practice!", "Getting easier to understand with common words!", "Made good progress with today's sounds!", "Saying sounds a little more clearly now!", "Pronunciation is getting a bit clearer!"], 2: ["Sounds are getting clearer bit by bit!", "Saying words better today, nice job!", "Pronunciation is slowly improving, keep going!", "Making nice progress with sounds lately!", "Getting clearer with words more often now!"], 3: ["Talking clearly today, great job!", "Words are sounding better and better!", "Pronunciation skills are really coming along!", "Doing better with tricky sounds lately!", "Pronunciation skills are coming along nicely!"] },
      3: { 1: ["Talks clearly most of the time!", "Pronunciation was clear for most of the lesson!", "Comfortable making today's target sounds!", "Said today's words really clearly, well done!", "Pronunciation is looking pretty solid now!"], 2: ["Great pronunciation today, sounds awesome!", "Really clear talking today, well done!", "Pronunciation is looking really solid now!", "Great job with pronunciation today!", "Sounds are really coming along well!"], 3: ["Pronunciation is really impressive now, amazing job!", "Talking so clearly today, great work!", "Pronunciation skills are getting really strong!", "Talked really clearly today, nice work!", "Pronunciation is looking really strong lately!"] },
      4: { 1: ["Very clear and natural talking today!", "Pronunciation was excellent the whole lesson!", "Sounded natural, even with tricky words!", "Pronunciation today was absolutely amazing, wow!", "Said everything so clearly with total ease!"], 2: ["Amazing talking today, so clear and confident!", "Perfect pronunciation all lesson, wow!", "Pronunciation today was outstanding, incredible job!", "This student's pronunciation today was fantastic!", "Amazing clarity all through the lesson!"], 3: ["Pronunciation today was superstar level, incredible!", "Such clear talking today, well done!", "Amazing job with pronunciation today!", "Pronunciation today couldn't have been better!", "Talked beautifully and clearly today!"] },
    },
    engagement: {
      1: { 1: ["Seemed a little distracted today.", "Needed extra encouragement to stay focused.", "Energy was a bit low today.", "Seemed a little low on energy today, that's okay.", "Needed extra encouragement to join in today."], 2: ["Seemed a little tired or distracted today, that's okay!", "Wasn't very into it today, let's try again next time.", "Energy was low today, hoping for more next lesson.", "Wasn't very focused during today's lesson.", "Needed lots of prompting to stay with us today."], 3: ["Seemed distracted a lot today, that's alright.", "Wasn't very focused today, we'll try again.", "Energy was low most of the lesson.", "Energy was low for most of today's lesson.", "Needed a lot of encouragement to participate."] },
      2: { 1: ["Joined in pretty well today!", "Took part with a little encouragement!", "Got more into it as the lesson went on!", "Joining in a bit more each time now!", "A little more focused today, nice job!"], 2: ["A bit more focused today, nice improvement!", "Getting more into it lesson by lesson!", "Energy is picking up a little, good job!", "Getting more into lessons lately, great job!", "Energy is picking up little by little!"], 3: ["Focused pretty well today, great job!", "Getting into the lesson more today!", "Energy was better today, nice work!", "Doing better staying focused lately!", "Joining in more than before, nice work!"] },
      3: { 1: ["Really engaged and joined in well today!", "Stayed focused the whole lesson!", "Took part actively in today's activities!", "Really joined in today, great energy!", "Focus was strong for most of the lesson!"], 2: ["Really into the lesson today, awesome energy!", "Great focus today, loved the participation!", "Energy was strong all through the lesson!", "Great energy and focus today!", "Really enjoyed having this student in class today!"], 3: ["Amazing energy today, loved having this student in class!", "Really engaged the whole lesson, awesome!", "Focus and energy were fantastic today!", "Energy was wonderful today, well done!", "Stayed really engaged the whole lesson!"] },
      4: { 1: ["Super engaged and excited the whole lesson!", "Brought amazing energy to the whole lesson!", "Fully engaged and eager to join in today!", "Energy today was absolutely amazing, wow!", "So much enthusiasm all lesson long today!"], 2: ["Amazing energy today, best lesson ever!", "So much fun having this student today, wow!", "Energy today was outstanding, incredible job!", "This student's energy today was fantastic!", "Amazing focus and fun all through the lesson!"], 3: ["Energy today was superstar level, incredible!", "Such amazing focus today, well done!", "Best energy ever today, amazing job!", "Energy today couldn't have been better!", "Such a joy to teach today, wonderful energy!"] },
    },
  },
  teen: {
    speaking: {
      1: { 1: ["Speaking's still tough right now and needs more guided practice.", "Had a hard time forming full sentences out loud today.", "Needed a lot of prompting just to speak up.", "Needs continued practice forming complete spoken responses.", "Speaking output was minimal without heavy prompting."], 2: ["Speaking is still a real struggle and needs more guided reps.", "Had trouble forming full sentences out loud today.", "Needs a lot more prompting to speak up in class.", "Struggled to initiate speaking without direct prompts.", "Verbal responses were limited throughout today's lesson."], 3: ["Speaking output was minimal today, needs continued practice.", "Relied heavily on prompts to produce any spoken response.", "Confidence with speaking is still developing \u2014 needs time.", "Speaking confidence is still an area to build up.", "Needed frequent encouragement to attempt speaking today."] },
      2: { 1: ["Speaking's coming along, just still a little hesitant.", "Got the point across with some help today.", "Steady progress putting sentences together on the spot.", "Speaking is becoming more consistent with practice.", "Attempted more spoken responses than in past lessons."], 2: ["Speaking is gradually improving with regular practice.", "Getting more willing to attempt speaking without prompts.", "Making noticeable progress with basic conversation today.", "A bit more willing to speak up unprompted today.", "Speaking output is gradually increasing lesson by lesson."], 3: ["Speaking confidence is slowly building lesson by lesson.", "Handled a few exchanges today with less hesitation.", "Attempting longer responses than in previous lessons.", "Showing more initiative with speaking these days.", "Making solid progress forming spoken responses."] },
      3: { 1: ["Spoke with solid confidence on familiar topics today.", "Held their own in back-and-forth conversation.", "Communicated clearly for most of the lesson.", "Communicated confidently on a range of topics today.", "Speaking flowed well throughout most of the lesson."], 2: ["Held a solid conversation today with good confidence.", "Communicated clearly on topics that are familiar.", "Spoke comfortably without needing much prompting today.", "Held their own well in today's conversation practice.", "Spoke with good clarity and confidence overall."], 3: ["Speaking flowed pretty naturally for most of the lesson.", "Handled unexpected questions well during conversation practice.", "Showed good control speaking on a range of topics.", "Handled today's speaking tasks with real confidence.", "Conversation felt natural for most of the lesson."] },
      4: { 1: ["Spoke fluently and confidently the whole lesson.", "Expressed ideas clearly and naturally, no hesitation.", "Barely needed any prompting today \u2014 impressive.", "Speaking today was consistently fluent and assured.", "Handled every conversational turn with real skill."], 2: ["Speaking was consistently fluent and confident all lesson.", "Handled every topic thrown at them with ease.", "Sounded completely natural in conversation today.", "Communicated with impressive fluency throughout today.", "Speaking confidence was evident the entire lesson."], 3: ["Speaking today was genuinely impressive from start to finish.", "Effortlessly carried the conversation the entire lesson.", "This was a standout lesson for spoken fluency.", "This was an excellent lesson for spoken fluency.", "Spoke with genuine ease on every topic today."] },
    },
    listening: {
      1: { 1: ["Had a hard time following spoken instructions today.", "Needed things repeated a few times to catch it.", "Struggles to catch key details when listening.", "Needed frequent repetition to process spoken content.", "Struggled to follow along without significant support."], 2: ["Following spoken instructions is still difficult right now.", "Needed frequent repetition to grasp what was said.", "Listening comprehension needs a lot more focused work.", "Listening comprehension remains limited at this stage.", "Required considerable repetition throughout today's lesson."], 3: ["Struggled to keep up with spoken instructions today.", "Comprehension broke down without significant repetition.", "Listening remains an area needing real focus.", "Following spoken instructions is still a challenge.", "Needed a lot of support catching what was said."] },
      2: { 1: ["Following spoken English is getting better steadily.", "Understood most instructions with a couple of repeats.", "Getting better at picking up key words.", "Requiring fewer repeats than in past lessons.", "Following along more consistently these days."], 2: ["Listening comprehension is steadily getting stronger.", "Picking up more spoken detail with each lesson.", "Needed less repetition than usual today.", "Listening comprehension is trending upward lately.", "Catching more spoken detail than before."], 3: ["Kept up with most instructions with minimal repeats.", "Listening skills are noticeably improving over time.", "Handled today's audio content reasonably well.", "Making solid progress following spoken content.", "Needed less support understanding instructions today."] },
      3: { 1: ["Followed most of the spoken content well today.", "Understood instructions quickly, barely needed repeats.", "Picked up on details well throughout the lesson.", "Followed today's spoken content with good accuracy.", "Listening comprehension held up well overall."], 2: ["Followed spoken content well throughout the lesson.", "Comprehension was solid across most of today's material.", "Picked up on details without needing repeats.", "Kept pace with conversation for most of the lesson.", "Understood spoken instructions with minimal repeats."], 3: ["Comprehension held up well even with faster speech.", "Rarely needed anything repeated today.", "Listening was a clear strength this lesson.", "Handled today's listening tasks with real confidence.", "Comprehension stayed solid throughout the lesson."] },
      4: { 1: ["Understood spoken English with total ease today.", "Followed fast, natural speech with no trouble at all.", "Excellent listening the entire lesson.", "Listening comprehension today was consistently strong.", "Followed fast, natural speech without any issue."], 2: ["Understood everything today with zero repetition needed.", "Listening comprehension was flawless this lesson.", "Picked up on every nuance in conversation today.", "Understood every instruction without needing repeats.", "This was an excellent lesson for listening skills."], 3: ["Listening today was genuinely outstanding from start to finish.", "Processed fast, natural speech without any issue.", "This was an excellent lesson for comprehension.", "Picked up on subtle spoken detail throughout today.", "Listening today was genuinely impressive start to finish."] },
    },
    reading: {
      1: { 1: ["Needed a lot of support decoding new words today.", "Reading's still slow and needs more help.", "Struggles to sound out unfamiliar words.", "Needed significant support decoding today's text.", "Reading fluency remains an area needing practice."], 2: ["Reading fluency is still quite limited right now.", "Needed a lot of help decoding today's text.", "Reading comprehension needs considerably more support.", "Struggled through much of today's passage.", "Required frequent help with unfamiliar words."], 3: ["Struggled through most of today's reading passage.", "Needed frequent help with unfamiliar words.", "Reading remains an area needing real focus.", "Reading remains slow and needs continued practice.", "Needed a lot of support with today's text."] },
      2: { 1: ["Reading's improving with regular practice.", "Got through most of the passage with some help.", "Getting better at sounding out new words.", "Handling more of the text independently now.", "Reading fluency is picking up steadily."], 2: ["Reading fluency is gradually picking up.", "Handling more of the text independently now.", "Needed less help than previous lessons.", "Needed less help than in past lessons.", "Making good progress decoding new words."], 3: ["Managed most of the passage with light support.", "Reading comprehension is noticeably improving.", "Handled today's text reasonably well overall.", "Reading is coming along nicely lately.", "Getting through passages more smoothly now."] },
      3: { 1: ["Read confidently with good comprehension today.", "Handled today's passage well with minimal help.", "Good reading fluency and understanding throughout.", "Read through today's passage with good accuracy.", "Reading fluency held up well overall today."], 2: ["Read confidently through most of today's material.", "Comprehension was solid across the passage.", "Handled today's text with good accuracy.", "Handled unfamiliar vocabulary reasonably well today.", "Reading comprehension stayed solid throughout."], 3: ["Handled today's passage with real confidence.", "Rarely needed help with unfamiliar words today.", "Reading was a clear strength this lesson.", "Did well reading today's material independently.", "Reading confidence is clearly building lesson by lesson."] },
      4: { 1: ["Read fluently and picked up on subtle nuance.", "Excellent comprehension of today's material.", "Read like a genuinely confident reader.", "Reading fluency today was consistently strong.", "Handled challenging text without any difficulty."], 2: ["Read fluently through the entire passage today.", "Comprehension was excellent across all the material.", "Picked up on subtle details while reading.", "Read through everything with real ease today.", "This was an excellent lesson for reading skills."], 3: ["Today's reading was genuinely impressive from start to finish.", "Handled challenging vocabulary with real ease.", "This was an excellent lesson for reading fluency.", "Picked up on nuance throughout today's reading.", "Reading today was genuinely impressive start to finish."] },
    },
    comprehension: {
      1: { 1: ["Struggled to grasp the meaning of today's material.", "Had difficulty explaining what the passage or dialogue was about.", "Needed a lot of guidance to understand the main ideas today.", "Comprehension of today's content was limited.", "Found it hard to answer questions about what was covered."], 2: ["Understanding today's material was a real struggle.", "Had trouble summarizing what the passage was about.", "Needed a lot of support grasping the main points today.", "Today's comprehension was fairly weak overall.", "Answering questions about the content was difficult today."], 3: ["Grasping today's content was tough throughout the lesson.", "Couldn't quite explain the gist of the material today.", "Needed significant help understanding the key points.", "Comprehension was a challenge for most of today.", "Struggled to respond to questions about the material."] },
      2: { 1: ["Comprehension is gradually improving with practice.", "Grasped the general idea of most of today's material.", "Answered some comprehension questions correctly today.", "Understanding of the material's meaning is coming along.", "Needed less help figuring out the main ideas today."], 2: ["Understanding is steadily getting better with practice.", "Picked up on the general gist of today's material.", "Got a handful of comprehension questions right today.", "Making decent progress grasping what the material means.", "Required less guidance with the main points today."], 3: ["Comprehension is improving lesson by lesson.", "Followed the general idea of most of the material.", "Answered a fair number of questions correctly today.", "Understanding the meaning is coming along nicely.", "Needed fewer hints to find the main ideas today."] },
      3: { 1: ["Grasped the meaning of today's material well overall.", "Answered most comprehension questions correctly today.", "Explained the main ideas clearly and accurately.", "Comprehension was solid throughout today's lesson.", "Understood the material with only occasional clarification needed."], 2: ["Understood today's material quite well overall.", "Got the majority of comprehension questions right today.", "Summarized the main ideas clearly and correctly.", "Comprehension held up well through the whole lesson.", "Only needed a little clarification here and there today."], 3: ["Picked up on the meaning of today's material well.", "Answered nearly all comprehension questions accurately today.", "Explained the key points clearly and correctly.", "Comprehension stayed strong throughout today's session.", "Rarely needed extra clarification on the material today."] },
      4: { 1: ["Fully grasped the meaning of today's material with ease.", "Answered every comprehension question correctly today.", "Explained the main ideas and nuances impressively well.", "Comprehension today was excellent from start to finish.", "Understood even the subtler points without any help."], 2: ["Understood every bit of today's material with real ease.", "Nailed every comprehension question today.", "Summarized the main ideas and nuances impressively well.", "Comprehension was excellent throughout the whole lesson.", "Picked up on subtler points without any assistance."], 3: ["Grasped all of today's material effortlessly.", "Got every single comprehension question correct today.", "Articulated the main ideas and nuances with real skill.", "Comprehension was outstanding from beginning to end.", "Understood even the trickiest points unaided."] },
    },
    vocabulary: {
      1: { 1: ["Vocabulary's pretty limited right now and needs more exposure.", "Struggled to recall recently learned words today.", "Needs more repetition to build up vocabulary.", "Needed significant repetition to recall target words.", "Vocabulary range remains fairly basic at this stage."], 2: ["Vocabulary range is still fairly limited right now.", "Needed a lot of help recalling recent words.", "Vocabulary needs considerably more repetition and exposure.", "Struggled to recall most of today's target words.", "Required frequent reminders of recent vocabulary."], 3: ["Struggled to recall most of today's target words.", "Needed frequent reminders of recently taught vocabulary.", "Vocabulary remains an area needing real focus.", "Word recall remains an area needing continued practice.", "Needed a lot of support with today's vocabulary."] },
      2: { 1: ["Vocabulary's growing steadily with practice.", "Picking up new words, still needs repetition.", "Used a few new words correctly today.", "Recalling more recently taught words than before.", "Vocabulary retention is picking up steadily."], 2: ["Vocabulary retention is gradually improving.", "Recalling more recently taught words than before.", "Needed fewer reminders than previous lessons.", "Needed fewer reminders than in past lessons.", "Making good progress building word knowledge."], 3: ["Used several new words correctly today.", "Vocabulary range is noticeably expanding.", "Handled today's target words reasonably well.", "Vocabulary is expanding nicely lately.", "Using new words more confidently now."] },
      3: { 1: ["Has a solid, usable vocabulary range.", "Used new vocabulary correctly and naturally today.", "Good recall of recently learned words.", "Used a range of vocabulary accurately today.", "Vocabulary recall held up well overall."], 2: ["Used a solid range of vocabulary today.", "Applied recently taught words accurately in context.", "Vocabulary use was consistent throughout the lesson.", "Applied recently taught words in context well.", "Vocabulary use stayed consistent throughout."], 3: ["Vocabulary use was strong across the whole lesson.", "Recalled and applied words with real confidence.", "Vocabulary was a clear strength this lesson.", "Did well using today's target vocabulary.", "Word choice is clearly improving lesson by lesson."] },
      4: { 1: ["Uses a genuinely rich and varied vocabulary.", "Impressive range of vocabulary for this level.", "Used advanced words naturally and correctly.", "Vocabulary use today was consistently impressive.", "Applied advanced words without any difficulty."], 2: ["Vocabulary use today was impressively varied.", "Applied advanced words naturally and correctly.", "Word choice was precise throughout the lesson.", "Used precise vocabulary with real ease today.", "This was an excellent lesson for word choice."], 3: ["Today's vocabulary use was genuinely impressive throughout.", "Picked exactly the right words to express ideas.", "This was a standout lesson for vocabulary.", "Picked exactly the right words throughout today.", "Vocabulary today was genuinely impressive start to finish."] },
    },
    grammar: {
      1: { 1: ["Makes frequent grammar mistakes that need correcting.", "Grammar needs a lot of guided practice.", "Struggled with basic sentence structure today.", "Needed significant correction with sentence structure.", "Grammar accuracy remains fairly limited at this stage."], 2: ["Grammar accuracy is still quite limited right now.", "Made frequent errors with basic sentence structure.", "Grammar needs considerably more guided practice.", "Struggled with basic structures throughout today.", "Required frequent correction with today's material."], 3: ["Struggled with grammar across most of today's work.", "Sentence structure needed frequent correction today.", "Grammar remains an area needing real focus.", "Sentence structure remains an area needing continued practice.", "Needed a lot of support with today's grammar point."] },
      2: { 1: ["Grammar's improving but still a bit inconsistent.", "Applied grammar rules correctly some of the time.", "Steady progress with sentence structure.", "Making fewer structural errors than before.", "Grammar accuracy is picking up steadily."], 2: ["Grammar accuracy is gradually improving.", "Made fewer structural errors than previous lessons.", "Applying basic rules more consistently now.", "Needed fewer corrections than in past lessons.", "Applying basic rules more consistently now."], 3: ["Grammar was mostly accurate throughout today's lesson.", "Applied today's grammar point with reasonable success.", "Sentence structure is noticeably more consistent.", "Grammar is improving nicely lately.", "Sentence structure is steadier now."] },
      3: { 1: ["Uses grammar accurately in most sentences.", "Applied today's grammar point well overall.", "Good control of sentence structure today.", "Applied today's grammar point with good accuracy.", "Grammar accuracy held up well overall."], 2: ["Grammar was accurate across most of today's lesson.", "Applied a range of structures correctly.", "Sentence construction was consistently solid today.", "Used a range of structures correctly today.", "Sentence construction stayed consistent throughout."], 3: ["Grammar accuracy held up well throughout the lesson.", "Rarely made structural errors today.", "Grammar was a clear strength this lesson.", "Did well applying today's grammar point.", "Grammar is clearly improving lesson by lesson."] },
      4: { 1: ["Has excellent command of grammar.", "Used complex grammar structures accurately today.", "Grammar was consistently accurate throughout.", "Grammar accuracy today was consistently strong.", "Used complex structures without any difficulty."], 2: ["Grammar was consistently accurate throughout today's lesson.", "Used complex structures correctly and naturally.", "Sentence construction was essentially flawless today.", "Applied grammar with real ease today.", "This was an excellent lesson for grammar."], 3: ["Today's grammar accuracy was genuinely impressive throughout.", "Applied nuanced structures with real confidence.", "This was a standout lesson for grammar.", "Sentence construction was essentially flawless today.", "Grammar today was genuinely impressive start to finish."] },
    },
    pronunciation: {
      1: { 1: ["Needs a lot of practice on pronunciation for clarity.", "Pronunciation made some words hard to understand today.", "Struggled with the sounds in today's vocabulary.", "Needed significant practice with today's target sounds.", "Pronunciation clarity remains fairly limited at this stage."], 2: ["Pronunciation clarity is still quite limited right now.", "Several sounds were hard to understand today.", "Pronunciation needs considerably more focused practice.", "Struggled with several sounds throughout today.", "Required frequent correction with today's pronunciation."], 3: ["Clarity was an issue across much of today's speech.", "Target sounds were difficult to produce today.", "Pronunciation remains an area needing real focus.", "Clarity remains an area needing continued practice.", "Needed a lot of support with today's sounds."] },
      2: { 1: ["Pronunciation's improving with practice.", "Getting clearer with commonly used words.", "Good progress with today's target sounds.", "Producing target sounds more consistently now.", "Pronunciation clarity is picking up steadily."], 2: ["Pronunciation clarity is gradually improving.", "Producing target sounds more consistently now.", "Needed fewer corrections than previous lessons.", "Needed fewer corrections than in past lessons.", "Making good progress with clarity."], 3: ["Pronunciation was mostly clear throughout today's lesson.", "Handled today's target sounds reasonably well.", "Clarity is noticeably more consistent now.", "Pronunciation is improving nicely lately.", "Sounds are getting steadier now."] },
      3: { 1: ["Has generally clear pronunciation.", "Pronunciation was clear for most of the lesson.", "Comfortable producing today's target sounds.", "Produced today's target sounds with good accuracy.", "Pronunciation clarity held up well overall."], 2: ["Pronunciation was clear across most of today's lesson.", "Produced a range of sounds accurately.", "Clarity was consistently solid throughout today.", "Handled a range of sounds correctly today.", "Clarity stayed consistent throughout the lesson."], 3: ["Clarity held up well throughout the entire lesson.", "Rarely needed correction with pronunciation today.", "Pronunciation was a clear strength this lesson.", "Did well with today's pronunciation targets.", "Clarity is clearly improving lesson by lesson."] },
      4: { 1: ["Has very clear, natural pronunciation.", "Pronunciation was excellent throughout the lesson.", "Sounded natural, even with challenging words.", "Pronunciation clarity today was consistently strong.", "Handled difficult sounds without any trouble."], 2: ["Pronunciation was consistently clear throughout today's lesson.", "Handled difficult sounds correctly and naturally.", "Clarity was essentially flawless today.", "Spoke with real clarity and ease today.", "This was an excellent lesson for pronunciation."], 3: ["Today's pronunciation was genuinely impressive throughout.", "Sounded near-native even on challenging words.", "This was a standout lesson for pronunciation.", "Sounded near-native throughout today's lesson.", "Pronunciation today was genuinely impressive start to finish."] },
    },
    engagement: {
      1: { 1: ["Seemed distracted or a little low-energy today.", "Needed extra encouragement to stay focused.", "Engagement was low throughout the lesson.", "Needed significant encouragement to participate today.", "Engagement remained fairly low throughout the lesson."], 2: ["Engagement was noticeably low throughout today's lesson.", "Needed frequent prompts to stay on task.", "Focus was difficult to maintain today.", "Struggled to stay focused for much of today.", "Required frequent prompts to stay on task."], 3: ["Struggled to stay engaged for most of the lesson.", "Needed constant redirection to stay on task.", "Engagement remains an area needing real focus.", "Focus remains an area needing continued attention.", "Needed a lot of encouragement to engage today."] },
      2: { 1: ["Was fairly engaged during the lesson.", "Participated with a little encouragement today.", "Engagement picked up as the lesson went on.", "Participating more consistently than before.", "Engagement is picking up steadily."], 2: ["Engagement is gradually improving lesson by lesson.", "Needed fewer reminders to stay on task today.", "Showed more interest than in previous lessons.", "Needed fewer reminders than in past lessons.", "Showing more interest lesson by lesson."], 3: ["Stayed engaged for most of today's lesson.", "Participation was fairly consistent throughout.", "Handled today's activities with reasonable focus.", "Focus is improving nicely lately.", "Staying on task more often now."] },
      3: { 1: ["Was engaged and participated well.", "Stayed focused and involved throughout the lesson.", "Took part actively in today's activities.", "Stayed engaged for most of today's lesson.", "Participation held up well overall."], 2: ["Stayed engaged and involved throughout today's lesson.", "Participated actively across most activities.", "Focus was consistently solid today.", "Brought good energy to today's activities.", "Focus stayed consistent throughout the lesson."], 3: ["Engagement held up strongly throughout the entire lesson.", "Brought consistent energy to every activity today.", "Engagement was a clear strength this lesson.", "Did well staying involved today.", "Engagement is clearly improving lesson by lesson."] },
      4: { 1: ["Was highly engaged and enthusiastic throughout.", "Brought great energy to the whole lesson.", "Fully engaged and eager to participate today.", "Engagement today was consistently strong.", "Brought excellent energy without any lapses."], 2: ["Engagement was outstanding throughout today's entire lesson.", "Brought excellent energy to every single activity.", "Focus was essentially unwavering today.", "Focus was essentially unwavering today.", "This was an excellent lesson for engagement."], 3: ["Today's engagement was genuinely exceptional from start to finish.", "Brought infectious enthusiasm to the entire lesson.", "This was a standout lesson for engagement.", "Brought infectious enthusiasm throughout today.", "Engagement today was genuinely impressive start to finish."] },
    },
  },
  adult: {
    speaking: {
      1: { 1: ["Speaking is still a challenge and needs more guided practice.", "Found it hard to form full sentences out loud today.", "Needs a lot of prompting to speak up in class.", "Verbal output remains limited and requires continued practice.", "Struggled to produce extended spoken responses today."], 2: ["Verbal expression remains limited and needs continued guided practice.", "Struggled to articulate full thoughts aloud during the session.", "Requires considerable prompting to engage in spoken output.", "Spoken communication needs considerably more development.", "Required heavy prompting to generate spoken output."], 3: ["Spoken output was minimal and required significant scaffolding.", "Continues to rely heavily on prompting for verbal responses.", "Verbal confidence is still in early development.", "Speaking confidence remains an area for growth.", "Verbal engagement was minimal throughout the session."] },
      2: { 1: ["Speaking is coming along, though still a bit hesitant at times.", "Managed to get points across with some prompting today.", "Showing steady progress putting sentences together out loud.", "Spoken output is becoming more consistent with practice.", "Attempted more extended responses than previous sessions."], 2: ["Verbal output is gradually improving with consistent practice.", "Showing increased willingness to initiate spoken responses.", "Making measurable progress with basic conversational exchanges.", "Showing increased willingness to speak without prompts.", "Verbal output is gradually increasing session by session."], 3: ["Speaking confidence is incrementally building session by session.", "Managed several exchanges today with reduced hesitation.", "Attempting longer spoken responses than previous sessions.", "Demonstrating more initiative with spoken responses.", "Making solid progress with verbal expression."] },
      3: { 1: ["Spoke with good confidence on familiar topics today.", "Held up well in back-and-forth conversation.", "Communicated clearly for most of the lesson.", "Communicated confidently across a range of topics today.", "Spoken delivery flowed well throughout most of the session."], 2: ["Demonstrated solid conversational confidence throughout the session.", "Communicated clearly and coherently on familiar subject matter.", "Engaged comfortably in dialogue with minimal prompting.", "Held a strong conversational exchange throughout today.", "Spoke with good clarity and confidence overall."], 3: ["Spoken delivery was largely natural throughout the lesson.", "Handled unexpected conversational turns competently.", "Demonstrated good control across a range of topics.", "Handled today's speaking tasks with genuine confidence.", "Conversation felt natural for most of the session."] },
      4: { 1: ["Spoke fluently and confidently throughout the lesson.", "Expressed ideas clearly and naturally without hesitation.", "Impressive fluency, barely needed any prompting today.", "Spoken delivery today was consistently fluent and assured.", "Navigated every conversational turn with real skill."], 2: ["Spoken delivery was consistently fluent and assured throughout.", "Navigated all discussion topics with notable ease.", "Demonstrated near-natural conversational fluency this session.", "Communicated with impressive fluency throughout today's session.", "Speaking confidence was evident the entire session."], 3: ["Spoken performance today was genuinely impressive throughout.", "Carried the conversation with notable ease and fluency.", "This was a standout session for spoken proficiency.", "This was an excellent session for spoken fluency.", "Spoke with genuine ease on every topic today."] },
    },
    listening: {
      1: { 1: ["Had trouble following spoken instructions today.", "Needed instructions repeated several times to understand.", "Struggles to catch key details when listening.", "Auditory comprehension requires continued focused practice.", "Struggled to process spoken input without support."], 2: ["Auditory comprehension remains limited at this stage.", "Required frequent repetition to process spoken input.", "Listening skills need considerably more focused development.", "Listening comprehension remains limited at this stage.", "Required considerable repetition throughout the session."], 3: ["Struggled to keep pace with spoken instructions today.", "Comprehension relied heavily on repeated input.", "Listening remains an area requiring focused attention.", "Following spoken instructions remains an area for growth.", "Needed significant support catching spoken content."] },
      2: { 1: ["Following spoken English is improving steadily.", "Understood most instructions with occasional repeats.", "Getting better at picking up key words when listening.", "Requiring fewer repeats than in previous sessions.", "Following along more consistently these days."], 2: ["Listening comprehension is showing steady improvement.", "Increasingly able to process spoken detail accurately.", "Required less repetition than in previous sessions.", "Listening comprehension is trending upward lately.", "Processing more spoken detail than before."], 3: ["Kept pace with most instructions requiring minimal repetition.", "Listening skills show clear improvement over recent sessions.", "Handled today's spoken content reasonably competently.", "Making solid progress following spoken content.", "Required less support understanding instructions today."] },
      3: { 1: ["Followed most spoken content well today.", "Understood instructions quickly with little repetition needed.", "Picked up on spoken details well throughout the lesson.", "Followed today's spoken content with good accuracy.", "Listening comprehension held up well overall."], 2: ["Followed spoken content competently throughout the session.", "Comprehension was solid across the majority of material.", "Picked up on finer details without repetition.", "Kept pace with conversation for most of the session.", "Understood spoken instructions with minimal repetition."], 3: ["Comprehension remained strong even with accelerated speech.", "Rarely required repetition of spoken input today.", "Listening was a clear strength during this session.", "Handled today's listening tasks with genuine confidence.", "Comprehension remained solid throughout the session."] },
      4: { 1: ["Understood spoken English with ease today.", "Followed fast, natural speech without any trouble.", "Excellent listening comprehension throughout the lesson.", "Listening comprehension today was consistently strong.", "Followed fast, natural speech without any difficulty."], 2: ["Comprehension was complete with no repetition required.", "Listening performance was effectively flawless this session.", "Picked up on subtle nuance throughout the conversation.", "Understood every instruction without requiring repetition.", "This was an excellent session for listening skills."], 3: ["Listening performance today was genuinely outstanding throughout.", "Processed rapid, natural speech without difficulty.", "This was an excellent session for auditory comprehension.", "Picked up on subtle spoken nuance throughout today.", "Listening performance today was genuinely impressive throughout."] },
    },
    reading: {
      1: { 1: ["Needs support decoding new words while reading.", "Reading is still slow and needs a lot of help.", "Struggles to sound out unfamiliar words.", "Reading fluency requires continued focused development.", "Struggled to decode much of today's material."], 2: ["Reading fluency remains limited at this stage.", "Required significant support decoding today's material.", "Reading comprehension needs considerably more development.", "Reading comprehension remains limited at this stage.", "Required considerable support with today's text."], 3: ["Struggled through the majority of today's passage.", "Required frequent assistance with unfamiliar vocabulary.", "Reading remains an area requiring focused attention.", "Reading fluency remains an area for growth.", "Needed significant assistance with today's passage."] },
      2: { 1: ["Reading is improving with regular practice.", "Managed most of the passage with some help.", "Getting better at sounding out new words.", "Handling increasingly more text independently now.", "Reading fluency is developing steadily."], 2: ["Reading fluency is gradually developing.", "Handling increasingly more text independently.", "Required less assistance than previous sessions.", "Required less assistance than in previous sessions.", "Making good progress decoding unfamiliar vocabulary."], 3: ["Managed most of the passage with minimal support.", "Reading comprehension shows noticeable improvement.", "Handled today's material reasonably competently overall.", "Reading is progressing nicely in recent sessions.", "Working through passages more smoothly now."] },
      3: { 1: ["Read confidently with good comprehension today.", "Handled today's passage well with minimal help.", "Good reading fluency and understanding throughout.", "Read through today's material with good accuracy.", "Reading fluency held up well throughout."], 2: ["Read confidently through the majority of today's material.", "Comprehension was solid across the entire passage.", "Handled today's text with good accuracy overall.", "Handled unfamiliar vocabulary reasonably well today.", "Reading comprehension remained solid throughout."], 3: ["Handled today's passage with genuine confidence.", "Rarely required assistance with unfamiliar vocabulary today.", "Reading was a clear strength during this session.", "Performed well reading today's material independently.", "Reading confidence is clearly building session by session."] },
      4: { 1: ["Read fluently and picked up on subtle nuance.", "Excellent comprehension of today's reading material.", "Read naturally, like a confident reader.", "Reading fluency today was consistently strong.", "Handled challenging material without any difficulty."], 2: ["Read fluently through the entirety of today's passage.", "Comprehension was excellent across all material covered.", "Picked up on subtle detail and nuance while reading.", "Read through material with genuine ease today.", "This was an excellent session for reading skills."], 3: ["Today's reading performance was genuinely impressive throughout.", "Handled challenging vocabulary with notable ease.", "This was an excellent session for reading fluency.", "Picked up on nuance throughout today's material.", "Reading performance today was genuinely impressive throughout."] },
    },
    comprehension: {
      1: { 1: ["Comprehension of today's material remains limited at this stage.", "Struggled to identify the main ideas in today's content.", "Required significant guidance to understand the material's meaning.", "Had difficulty answering comprehension questions about today's content.", "Grasping the underlying meaning of the material needs more work."], 2: ["Comprehension remains an area needing considerable development.", "Had difficulty identifying key ideas in today's material.", "Needed substantial support to understand the content's meaning.", "Struggled to respond accurately to comprehension questions today.", "Understanding the material's underlying meaning needs further practice."], 3: ["Comprehension of today's content was limited overall.", "Found it difficult to pinpoint the main ideas today.", "Required considerable guidance to grasp the material's meaning.", "Comprehension questions proved difficult to answer today.", "Deeper understanding of the material remains an area for growth."] },
      2: { 1: ["Comprehension is showing steady improvement.", "Grasped the general meaning of most of today's material.", "Answered several comprehension questions accurately today.", "Understanding of underlying meaning is developing well.", "Required less guidance identifying main ideas today."], 2: ["Comprehension is improving at a steady pace.", "Followed the general meaning of most of today's content.", "Answered a good number of comprehension questions correctly.", "Grasp of the material's meaning is coming along well.", "Needed less support identifying key ideas today."], 3: ["Comprehension continues to improve gradually.", "Understood the general gist of most of today's material.", "Responded accurately to several comprehension questions today.", "Understanding of meaning is progressing well.", "Required less prompting to identify main ideas today."] },
      3: { 1: ["Grasped the meaning of today's material well overall.", "Answered the majority of comprehension questions accurately.", "Articulated the main ideas clearly and accurately.", "Comprehension was solid throughout today's session.", "Understood the material with only occasional clarification needed."], 2: ["Understood today's material well on the whole.", "Answered most comprehension questions with accuracy.", "Summarized the main ideas clearly and correctly.", "Comprehension remained solid throughout the session.", "Needed only minimal clarification on the material today."], 3: ["Grasped the overall meaning of today's material effectively.", "Responded accurately to most comprehension questions today.", "Articulated key ideas clearly and correctly.", "Comprehension held up consistently throughout today's session.", "Rarely required clarification on the material today."] },
      4: { 1: ["Fully grasped the meaning of today's material with ease.", "Answered comprehension questions accurately and thoughtfully throughout.", "Articulated main ideas and subtler nuances impressively well.", "Comprehension today was excellent from start to finish.", "Understood even the more nuanced points without assistance."], 2: ["Grasped the full meaning of today's material effortlessly.", "Answered every comprehension question with accuracy and thought.", "Articulated main ideas and nuance with real sophistication.", "Comprehension was excellent throughout today's entire session.", "Understood nuanced points without any assistance needed."], 3: ["Understood the entirety of today's material with real ease.", "Responded to comprehension questions thoughtfully and accurately throughout.", "Captured main ideas and subtleties impressively well.", "Comprehension was outstanding from beginning to end today.", "Grasped even nuanced points entirely unaided."] },
    },
    vocabulary: {
      1: { 1: ["Vocabulary is limited and needs more exposure to new words.", "Struggled to recall recently learned words today.", "Needs more repetition to build vocabulary.", "Vocabulary recall requires continued focused development.", "Struggled to apply much of today's target vocabulary."], 2: ["Vocabulary range remains fairly limited at this stage.", "Required significant support recalling recently taught terms.", "Vocabulary needs considerably more repetition and exposure.", "Vocabulary range remains fairly limited at this stage.", "Required considerable repetition with today's terms."], 3: ["Struggled to recall the majority of target vocabulary.", "Required frequent reminders of recently introduced terms.", "Vocabulary remains an area requiring focused attention.", "Word recall remains an area for growth.", "Needed significant support with today's vocabulary."] },
      2: { 1: ["Vocabulary is growing steadily with practice.", "Picking up new words, though still needs repetition.", "Used a few new words correctly today.", "Recalling an increasing number of recent terms.", "Vocabulary retention is developing steadily."], 2: ["Vocabulary retention is gradually improving.", "Recalling an increasing number of recently taught terms.", "Required fewer reminders than previous sessions.", "Required fewer reminders than in previous sessions.", "Making good progress building terminology."], 3: ["Used several new terms correctly today.", "Vocabulary range is noticeably expanding.", "Handled today's target vocabulary reasonably competently.", "Vocabulary is expanding nicely in recent sessions.", "Using new terms more confidently now."] },
      3: { 1: ["Has a solid, usable vocabulary range.", "Used new vocabulary correctly and naturally today.", "Good recall of recently learned words.", "Used a range of vocabulary accurately today.", "Vocabulary recall held up well throughout."], 2: ["Used a solid range of vocabulary today.", "Applied recently introduced terms accurately in context.", "Vocabulary use was consistent throughout the session.", "Applied recently introduced terms in context well.", "Vocabulary use remained consistent throughout."], 3: ["Vocabulary use was strong throughout the entire session.", "Recalled and applied terms with genuine confidence.", "Vocabulary was a clear strength during this session.", "Performed well using today's target vocabulary.", "Word choice is clearly improving session by session."] },
      4: { 1: ["Uses a rich and varied vocabulary.", "Impressive range of vocabulary for this level.", "Used advanced words naturally and correctly.", "Vocabulary use today was consistently impressive.", "Applied advanced terminology without any difficulty."], 2: ["Vocabulary use today was impressively varied and precise.", "Applied advanced terminology naturally and accurately.", "Word choice was precise throughout the session.", "Used precise vocabulary with genuine ease today.", "This was an excellent session for word choice."], 3: ["Today's vocabulary use was genuinely impressive throughout.", "Selected precise terminology to express ideas clearly.", "This was a standout session for vocabulary use.", "Selected exactly the right terms throughout today.", "Vocabulary use today was genuinely impressive throughout."] },
    },
    grammar: {
      1: { 1: ["Makes frequent grammar mistakes that need correcting.", "Grammar needs a lot of guided practice.", "Struggled with basic sentence structure today.", "Grammatical accuracy requires continued focused development.", "Struggled with much of today's sentence structure."], 2: ["Grammatical accuracy remains limited at this stage.", "Frequent errors occurred with basic sentence structure.", "Grammar requires considerably more guided practice.", "Grammar accuracy remains fairly limited at this stage.", "Required considerable correction with today's material."], 3: ["Struggled with grammar across the majority of today's work.", "Sentence structure required frequent correction today.", "Grammar remains an area requiring focused attention.", "Sentence structure remains an area for growth.", "Needed significant support with today's grammar point."] },
      2: { 1: ["Grammar is improving but still inconsistent.", "Applied grammar rules correctly some of the time.", "Making steady progress with sentence structure.", "Producing fewer structural errors than before.", "Grammatical accuracy is developing steadily."], 2: ["Grammatical accuracy is gradually improving.", "Fewer structural errors occurred than in previous sessions.", "Applying basic grammar rules more consistently now.", "Required fewer corrections than in previous sessions.", "Applying basic rules more consistently now."], 3: ["Grammar was mostly accurate throughout today's session.", "Applied today's grammar point with reasonable success.", "Sentence structure is noticeably more consistent now.", "Grammar is improving nicely in recent sessions.", "Sentence structure is steadier now."] },
      3: { 1: ["Uses grammar accurately in most sentences.", "Applied today's grammar point well overall.", "Good control of sentence structure today.", "Applied today's grammar point with good accuracy.", "Grammatical accuracy held up well throughout."], 2: ["Grammar was accurate across the majority of today's session.", "Applied a range of structures correctly and consistently.", "Sentence construction was consistently solid throughout.", "Used a range of structures correctly today.", "Sentence construction remained consistent throughout."], 3: ["Grammatical accuracy held up well throughout the session.", "Rarely produced structural errors today.", "Grammar was a clear strength during this session.", "Performed well applying today's grammar point.", "Grammar is clearly improving session by session."] },
      4: { 1: ["Has excellent command of grammar.", "Used complex grammar structures accurately today.", "Grammar was consistently accurate throughout.", "Grammatical accuracy today was consistently strong.", "Used complex structures without any difficulty."], 2: ["Grammar was consistently accurate throughout today's session.", "Used complex structures correctly and naturally.", "Sentence construction was essentially flawless throughout.", "Applied grammar with genuine ease today.", "This was an excellent session for grammar."], 3: ["Today's grammatical accuracy was genuinely impressive throughout.", "Applied nuanced structures with genuine confidence.", "This was a standout session for grammar.", "Sentence construction was essentially flawless today.", "Grammatical accuracy today was genuinely impressive throughout."] },
    },
    pronunciation: {
      1: { 1: ["Needs a lot of practice on pronunciation for clarity.", "Pronunciation made some words hard to understand today.", "Struggled with the sounds in today's vocabulary.", "Pronunciation clarity requires continued focused development.", "Struggled with several of today's target sounds."], 2: ["Pronunciation clarity remains limited at this stage.", "Several sounds were difficult to understand today.", "Pronunciation requires considerably more focused practice.", "Pronunciation clarity remains fairly limited at this stage.", "Required considerable correction with today's sounds."], 3: ["Clarity was an issue across much of today's speech.", "Target sounds were difficult to produce today.", "Pronunciation remains an area requiring focused attention.", "Clarity remains an area for growth.", "Needed significant support with today's pronunciation."] },
      2: { 1: ["Pronunciation is improving with practice.", "Getting clearer with commonly used words.", "Made good progress with today's target sounds.", "Producing target sounds more consistently now.", "Pronunciation clarity is developing steadily."], 2: ["Pronunciation clarity is gradually improving.", "Producing target sounds more consistently now.", "Required fewer corrections than previous sessions.", "Required fewer corrections than in previous sessions.", "Making good progress with clarity."], 3: ["Pronunciation was mostly clear throughout today's session.", "Handled today's target sounds reasonably competently.", "Clarity is noticeably more consistent now.", "Pronunciation is improving nicely in recent sessions.", "Sounds are getting steadier now."] },
      3: { 1: ["Has generally clear pronunciation.", "Pronunciation was clear for most of the lesson.", "Comfortable producing today's target sounds.", "Produced today's target sounds with good accuracy.", "Pronunciation clarity held up well throughout."], 2: ["Pronunciation was clear across the majority of today's session.", "Produced a range of sounds accurately and consistently.", "Clarity was consistently solid throughout the session.", "Handled a range of sounds correctly today.", "Clarity remained consistent throughout the session."], 3: ["Clarity held up well throughout the entire session.", "Rarely required correction with pronunciation today.", "Pronunciation was a clear strength during this session.", "Performed well with today's pronunciation targets.", "Clarity is clearly improving session by session."] },
      4: { 1: ["Has very clear, natural pronunciation.", "Pronunciation was excellent throughout the lesson.", "Sounded natural, even with challenging words.", "Pronunciation clarity today was consistently strong.", "Handled difficult sounds without any trouble."], 2: ["Pronunciation was consistently clear throughout today's session.", "Handled difficult sounds correctly and naturally.", "Clarity was essentially flawless throughout the session.", "Spoke with genuine clarity and ease today.", "This was an excellent session for pronunciation."], 3: ["Today's pronunciation was genuinely impressive throughout.", "Sounded near-native even on challenging vocabulary.", "This was a standout session for pronunciation.", "Sounded near-native throughout today's session.", "Pronunciation performance today was genuinely impressive throughout."] },
    },
    engagement: {
      1: { 1: ["Seemed distracted or low-energy today.", "Needed extra encouragement to stay focused.", "Engagement was low throughout the lesson.", "Engagement remains limited and requires continued encouragement.", "Struggled to remain focused for much of the session."], 2: ["Engagement was noticeably low throughout today's session.", "Required frequent prompts to remain on task.", "Sustained focus was difficult to maintain today.", "Engagement remained fairly low throughout today.", "Required frequent prompts to remain on task."], 3: ["Struggled to remain engaged for most of the session.", "Required constant redirection to stay on task.", "Engagement remains an area requiring focused attention.", "Focus remains an area for continued attention.", "Needed significant encouragement to engage today."] },
      2: { 1: ["Was somewhat engaged during the lesson.", "Participated with a little encouragement today.", "Engagement picked up as the lesson went on.", "Participating more consistently than before.", "Engagement is developing steadily."], 2: ["Engagement is gradually improving session by session.", "Required fewer reminders to remain on task today.", "Demonstrated more interest than in previous sessions.", "Required fewer reminders than in previous sessions.", "Demonstrating more interest session by session."], 3: ["Remained engaged for most of today's session.", "Participation was fairly consistent throughout.", "Handled today's activities with reasonable focus.", "Focus is improving nicely in recent sessions.", "Remaining on task more often now."] },
      3: { 1: ["Was engaged and participated well.", "Stayed focused and involved throughout the lesson.", "Took part actively in today's activities.", "Remained engaged for most of today's session.", "Participation held up well throughout."], 2: ["Remained engaged and involved throughout today's session.", "Participated actively across the majority of activities.", "Focus was consistently solid throughout the session.", "Brought good energy to today's activities.", "Focus remained consistent throughout the session."], 3: ["Engagement held up strongly throughout the entire session.", "Brought consistent energy to every activity today.", "Engagement was a clear strength during this session.", "Performed well remaining involved today.", "Engagement is clearly improving session by session."] },
      4: { 1: ["Was highly engaged and enthusiastic throughout.", "Brought great energy to the whole lesson.", "Fully engaged and eager to participate today.", "Engagement today was consistently strong.", "Brought excellent energy without any lapses."], 2: ["Engagement was outstanding throughout today's entire session.", "Brought excellent energy to every activity.", "Focus was essentially unwavering throughout the session.", "Focus was essentially unwavering today.", "This was an excellent session for engagement."], 3: ["Today's engagement was genuinely exceptional throughout.", "Brought notable enthusiasm to the entire session.", "This was a standout session for engagement.", "Brought notable enthusiasm throughout today.", "Engagement today was genuinely impressive throughout."] },
    },
  },
};

const AGE_STYLE = {
  kid: {
    opener: ['Great job in class today!', 'What a fun lesson today!', 'Awesome work today!'],
    strengthLead: 'did really well with',
    focusLead: "Let's keep practicing",
    closer: ['Keep it up, superstar! 🌟', "You're doing great — see you next time!", 'Proud of you today! 🎉'],
  },
  teen: {
    opener: ['Nice work in class today.', 'Solid lesson today.', 'Good effort today.'],
    strengthLead: 'did well with',
    focusLead: 'A couple of things to work on:',
    closer: ["Keep practicing and you'll keep improving.", 'See you next lesson!', 'Nice progress — keep it up.'],
  },
  adult: {
    opener: ["Good session today.", "Solid progress in today's lesson.", 'Productive lesson today.'],
    strengthLead: 'showed strength in',
    focusLead: 'Areas to continue developing:',
    closer: ['Keep up the consistent practice.', 'Looking forward to our next session.', 'Steady progress — well done.'],
  },
};
const LEVEL_SUFFIX = { beginner: ' Every small step counts!', intermediate: ' Staying consistent will really pay off.', upper: " Keep refining the finer details." };

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function autoGenerateComment(levels, ageGroup, levelBucket, commentSet) {
  const style = AGE_STYLE[ageGroup] || AGE_STYLE.adult;
  const opener = pick(style.opener);
  const closer = pick(style.closer) + (LEVEL_SUFFIX[levelBucket] || '');
  const shuffled = [...SKILLS].sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, 3);
  const sentences = chosen.map((sk) => {
    const setToUse = commentSet || Math.ceil(Math.random() * 3); // random set each time if none picked
    return pick(PHRASE_VARIANTS[ageGroup || 'adult'][sk.key][levels[sk.key]][setToUse]);
  });
  return `${opener} ${sentences.join(' ')} ${closer}`;
}
function currentLevelBucket(assessments, studentId) {
  const hist = assessments[studentId];
  if (!hist || hist.length === 0) return 'beginner';
  return levelForScore(hist[0].average).bucket;
}

/* ---------------- helpers ---------------- */

function uid(prefix = 'id') { return prefix + '_' + Math.random().toString(36).slice(2, 9); }
function pad2(n) { return String(n).padStart(2, '0'); }
function minutesToHHMM(mins) { return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`; }
function hhmmToMinutes(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function displayTime(t) { return t.replace(/^0/, ''); }
function slotRangeLabel(t) { const start = hhmmToMinutes(t); return `${displayTime(minutesToHHMM(start))}-${displayTime(minutesToHHMM(start + 25))}`; }

// How many hours from right now until a PH-anchored slot actually starts. Negative means it's
// already in the past. Used for the 24-hour late-cancellation policy.
const LATE_CHANGE_HOURS = 24;
const FREE_RESCHEDULES_PER_MONTH = 2;
function hoursUntilSlot(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const slotUTC = new Date(Date.UTC(y, m - 1, d, hh - 8, mm || 0));
  return (slotUTC.getTime() - Date.now()) / (1000 * 60 * 60);
}

// the underlying grid is anchored to PH time (UTC+8, no DST) since that's the teacher's real clock.
function convertAnchorTime(dateStr, timeStr, targetTz) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, hh - 8, mm || 0));
  return new Intl.DateTimeFormat('en-GB', { timeZone: targetTz, hour: '2-digit', minute: '2-digit', hour12: false }).format(utcDate);
}
// Israel/Poland are far enough behind PH time that some slots land on a different calendar day
// for them — this figures out which local date a PH-anchored slot actually falls on, so we can
// flag it instead of just silently showing a time that looks "out of order" for that day.
function convertAnchorDate(dateStr, timeStr, targetTz) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, hh - 8, mm || 0));
  return new Intl.DateTimeFormat('en-CA', { timeZone: targetTz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(utcDate);
}
function displaySlotLabel(dateStr, time, tzOption) {
  if (tzOption.id === 'ph') return slotRangeLabel(time);
  const start = convertAnchorTime(dateStr, time, tzOption.tz);
  const [h, m] = start.split(':').map(Number);
  const endMins = h * 60 + m + 25;
  const label = `${displayTime(start)}-${displayTime(minutesToHHMM(((endMins % 1440) + 1440) % 1440))}`;
  const localDateStr = convertAnchorDate(dateStr, time, tzOption.tz);
  if (localDateStr !== dateStr) {
    const [ly, lm, ld] = localDateStr.split('-').map(Number);
    const weekday = new Date(ly, lm - 1, ld).toLocaleDateString('en-US', { weekday: 'short' });
    return `${label} (${weekday})`;
  }
  return label;
}

function generateSlots() {
  const slots = [];
  for (let mins = 0; mins <= 1410; mins += 30) slots.push(minutesToHHMM(mins));
  return slots;
}
const ALL_SLOTS = generateSlots();

function toDateStr(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return toDateStr(dt);
}
function dayOfWeekName(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return DAYS[(dt.getDay() + 6) % 7];
}
function mondayOf(dateStr) { return addDays(dateStr, -DAYS.indexOf(dayOfWeekName(dateStr))); }
function prettyDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}
function templateDate(dateStr) { const [y, m, d] = dateStr.split('-'); return `${m} ${d} ${y}`; }

// "shared" data (students, bookings, payments, etc.) lives in Supabase so every device and
// every person — teacher and students alike — reads and writes the exact same real data.
// "non-shared" data (just which name this particular browser is currently logged in as)
// stays in this browser's own localStorage, since that's meant to be per-device only.
async function loadKey(key, fallback, shared = false) {
  if (!shared) {
    try { const raw = window.localStorage.getItem(`esl_${key}`); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  try {
    const { data, error } = await supabase.from('app_data').select('value').eq('key', key).maybeSingle();
    if (error || !data) return fallback;
    return data.value ?? fallback;
  } catch (e) { console.error('Supabase load failed', key, e); return fallback; }
}
async function saveKey(key, value, shared = false) {
  if (!shared) {
    try { window.localStorage.setItem(`esl_${key}`, JSON.stringify(value)); } catch (e) { /* ignore */ }
    return;
  }
  try {
    const { error } = await supabase.from('app_data').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) console.error('Supabase save failed', key, error);
  } catch (e) { console.error('Supabase save failed', key, e); }
}
async function deleteKey(key, shared = false) {
  if (!shared) {
    try { window.localStorage.removeItem(`esl_${key}`); } catch (e) { /* ignore */ }
    return;
  }
  try { await supabase.from('app_data').delete().eq('key', key); } catch (e) { /* ignore */ }
}
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Loading jsPDF from a CDN inside the sandboxed artifact preview turned out to be unreliable —
// the script tag often can't finish loading in this environment, which is why "Save as PDF" wasn't
// actually working. Drawing the receipt straight onto a <canvas> and exporting it as a PNG avoids
// any network request or external library entirely, so it works the same everywhere every time.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

async function generateReceiptImage(student, payment, settings) {
  const W = 900;
  const marginX = 60;
  const canvas = document.createElement('canvas');
  const scale = 2; // draw at 2x for a crisp download, then scale the CSS-facing size back down
  const ctx = canvas.getContext('2d');

  // First pass at a generous height; we trim the canvas to the actual content height at the end.
  const H = 1100;
  canvas.width = W * scale;
  canvas.height = H * scale;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  let y = 70;
  let textX = marginX;

  if (settings?.logoDataUrl) {
    try {
      const img = await loadImage(settings.logoDataUrl);
      ctx.drawImage(img, marginX, y - 40, 64, 64);
      textX = marginX + 80;
    } catch (e) { /* skip logo if it fails to decode */ }
  }

  ctx.fillStyle = '#111111';
  ctx.font = '600 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(settings?.businessName || 'Lesson Receipt', textX, y);
  ctx.fillStyle = '#777777';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.fillText('Official lesson receipt', textX, y + 20);

  y += 70;
  ctx.strokeStyle = '#dddddd';
  ctx.beginPath(); ctx.moveTo(marginX, y); ctx.lineTo(W - marginX, y); ctx.stroke();
  y += 36;

  const rows = [
    ['Received from', student.name],
    ['Date', templateDate(payment.date)],
    ['Amount paid', `₱${payment.amount.toFixed(2)}`],
    ['Lessons purchased', String(payment.lessonsPurchased)],
  ];
  if (payment.note) rows.push(['Note', payment.note]);
  ctx.font = '15px system-ui, -apple-system, sans-serif';
  rows.forEach(([label, value]) => {
    ctx.fillStyle = '#666666';
    ctx.fillText(label, marginX, y);
    ctx.fillStyle = '#111111';
    const valueWidth = ctx.measureText(String(value)).width;
    ctx.fillText(String(value), W - marginX - valueWidth, y);
    y += 30;
  });

  if (settings?.policiesText) {
    y += 20;
    ctx.fillStyle = '#666666';
    ctx.font = '600 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('Rules & policies:', marginX, y);
    y += 18;
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#444444';
    const wrapped = wrapCanvasText(ctx, settings.policiesText, W - marginX * 2);
    wrapped.forEach((line) => { ctx.fillText(line, marginX, y); y += 16; });
    y += 10;
  }

  y += 50;
  ctx.fillStyle = '#666666';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.fillText('Signature:', W - marginX - 220, y);
  if (settings?.signatureDataUrl) {
    try {
      const img = await loadImage(settings.signatureDataUrl);
      ctx.drawImage(img, W - marginX - 130, y - 22, 130, 40);
    } catch (e) { /* skip */ }
  } else if (settings?.signatureText) {
    ctx.font = 'italic 22px "Brush Script MT", cursive';
    ctx.fillStyle = '#111111';
    ctx.fillText(settings.signatureText, W - marginX - 130, y);
  }
  y += 40;

  // Trim the canvas down to the content we actually drew, so the PNG isn't mostly blank space.
  const finalH = Math.min(H, y + 20);
  const trimmed = document.createElement('canvas');
  trimmed.width = W * scale;
  trimmed.height = finalH * scale;
  const tctx = trimmed.getContext('2d');
  tctx.drawImage(canvas, 0, 0, W * scale, finalH * scale, 0, 0, W * scale, finalH * scale);

  const dataUrl = trimmed.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `receipt-${student.name.replace(/\s+/g, '-')}-${payment.date}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ---------------- seed data ---------------- */

const SEED_STUDENTS = [
  { id: 'stu_demo_company', name: 'Demo (Company) — edit me', category: 'company', rate: 200, lessonsRemaining: null, color: CATEGORY_META.company.color, ageGroup: 'adult', age: '', nationality: '', contact: '', familyPoolId: null, homeTz: 'ph', pin: '' },
  { id: 'stu_demo_private', name: 'Demo (Private) — edit me', category: 'private', rate: 200, lessonsRemaining: 20, color: CATEGORY_META.private.color, ageGroup: 'adult', age: '', nationality: '', contact: '', familyPoolId: null, homeTz: 'ph', pin: '' },
];

/* ---------------- small UI atoms ---------------- */

function Pill({ children, color }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: color + '22', color, border: `1px solid ${color}55` }}>{children}</span>;
}

function Btn({ children, onClick, variant = 'default', className = '', title, disabled }) {
  const base = 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const styles = {
    default: { backgroundColor: PAPER_LIGHT, color: TEXT, border: `1px solid ${BORDER}` },
    accent: { backgroundColor: ACCENT, color: '#231506', border: `1px solid ${ACCENT}` },
    ghost: { backgroundColor: 'transparent', color: MUTED, border: '1px solid transparent' },
    danger: { backgroundColor: 'transparent', color: RED, border: `1px solid #6b3535` },
  };
  return <button title={title} disabled={disabled} onClick={onClick} className={base + ' ' + className} style={styles[variant]}>{children}</button>;
}

function Modal({ children, onClose, wide, persistent }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: '#000000aa', overscrollBehavior: 'contain' }} onClick={persistent ? undefined : onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-sm'} rounded-2xl p-5`}
        style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}`, color: TEXT, maxHeight: '85vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-y' }}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------------- Role gate ---------------- */

function RoleGate({ students, settings, onSetTeacher, onSetStudent, onSetRepresentative }) {
  const [mode, setMode] = useState(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [studentPick, setStudentPick] = useState('');
  const [pinStage, setPinStage] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [repPasscodeInput, setRepPasscodeInput] = useState('');
  const [repError, setRepError] = useState('');
  const [error, setError] = useState('');
  const isFirstRun = !settings || !settings.teacherPasscode;
  const bookable = students.filter((s) => s.category !== 'company');
  const pickedStudent = students.find((s) => s.id === studentPick);

  const proceedAsStudent = () => {
    if (pickedStudent && pickedStudent.pin) {
      setPinStage(true);
      setPinError('');
    } else {
      onSetStudent(studentPick);
    }
  };
  const confirmPin = () => {
    if (pinInput === pickedStudent.pin) onSetStudent(studentPick);
    else setPinError('Wrong PIN — ask your teacher if you forgot it.');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ backgroundColor: INK, color: TEXT, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
        <h1 className="text-xl font-semibold mb-1">ESL Console</h1>
        <p className="text-sm mb-5" style={{ color: MUTED }}>Who's opening this?</p>

        {mode === null && (
          <div className="flex flex-col gap-2">
            <Btn variant="accent" onClick={() => setMode('teacher')}>I'm the teacher</Btn>
            <Btn onClick={() => setMode('student')}>I'm a student</Btn>
            <Btn onClick={() => setMode('representative')}>I'm a company representative</Btn>
          </div>
        )}

        {mode === 'teacher' && (
          isFirstRun ? (
            <div>
              <p className="text-xs mb-2" style={{ color: MUTED }}>First time setup — choose a passcode for teacher access.</p>
              <input type="password" value={newPasscode} onChange={(e) => setNewPasscode(e.target.value)} placeholder="Choose a passcode"
                className="w-full rounded-md px-2 py-1.5 text-sm outline-none mb-2" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
              <Btn variant="accent" disabled={!newPasscode.trim()} onClick={() => onSetTeacher(newPasscode.trim())}>Save & continue</Btn>
            </div>
          ) : (
            <div>
              <input type="password" value={passcodeInput} onChange={(e) => setPasscodeInput(e.target.value)} placeholder="Passcode"
                className="w-full rounded-md px-2 py-1.5 text-sm outline-none mb-2" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
              {error && <p className="text-xs mb-2" style={{ color: RED }}>{error}</p>}
              <Btn variant="accent" onClick={() => { if (passcodeInput === settings.teacherPasscode) onSetTeacher(null); else setError('Wrong passcode'); }}>Enter</Btn>
            </div>
          )
        )}

        {mode === 'student' && !pinStage && (
          <div>
            <p className="text-xs mb-2" style={{ color: MUTED }}>Pick your name to view and book your own lessons.</p>
            <select value={studentPick} onChange={(e) => setStudentPick(e.target.value)} className="w-full rounded-md px-2 py-1.5 text-sm outline-none mb-2" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="">Select your name…</option>
              {bookable.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Btn variant="accent" disabled={!studentPick} onClick={proceedAsStudent}>Continue</Btn>
          </div>
        )}

        {mode === 'student' && pinStage && (
          <div>
            <p className="text-xs mb-2" style={{ color: MUTED }}>Enter your PIN, {pickedStudent?.name}.</p>
            <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="PIN"
              className="w-full rounded-md px-2 py-1.5 text-sm outline-none mb-2" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
            {pinError && <p className="text-xs mb-2" style={{ color: RED }}>{pinError}</p>}
            <Btn variant="accent" onClick={confirmPin}>Enter</Btn>
            <button onClick={() => { setPinStage(false); setPinInput(''); setPinError(''); }} className="text-xs mt-3 block" style={{ color: MUTED }}>← pick a different name</button>
          </div>
        )}

        {mode === 'representative' && (
          !settings?.repPasscode ? (
            <p className="text-sm" style={{ color: MUTED }}>Representative access hasn't been set up yet — ask your teacher to enable it in the Billing tab's settings.</p>
          ) : (
            <div>
              <p className="text-xs mb-2" style={{ color: MUTED }}>Enter the company representative passcode.</p>
              <input type="password" value={repPasscodeInput} onChange={(e) => setRepPasscodeInput(e.target.value)} placeholder="Passcode"
                className="w-full rounded-md px-2 py-1.5 text-sm outline-none mb-2" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
              {repError && <p className="text-xs mb-2" style={{ color: RED }}>{repError}</p>}
              <Btn variant="accent" onClick={() => { if (repPasscodeInput === settings.repPasscode) onSetRepresentative(); else setRepError('Wrong passcode'); }}>Enter</Btn>
            </div>
          )
        )}

        {mode && <button onClick={() => { setMode(null); setError(''); setPinStage(false); setPinInput(''); setPinError(''); setStudentPick(''); setRepPasscodeInput(''); setRepError(''); }} className="text-xs mt-4" style={{ color: MUTED }}>← back</button>}
      </div>
    </div>
  );
}

/* ---------------- main app ---------------- */

export default function ESLConsole() {
  const [loaded, setLoaded] = useState(false);
  const [students, setStudents] = useState(SEED_STUDENTS);
  const [classLog, setClassLog] = useState({});
  const [assessments, setAssessments] = useState({});
  const [payments, setPayments] = useState({});
  const [familyPools, setFamilyPools] = useState([]);
  const [settings, setSettings] = useState(null);
  const [identity, setIdentity] = useState(undefined);
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [view, setView] = useState('day');
  const [timeFilter, setTimeFilter] = useState('all');
  const [displayTz] = useState(DISPLAY_TZ_OPTIONS[0]);
  const [compareTz, setCompareTz] = useState(null);
  const [activeTab, setActiveTab] = useState('schedule');
  const [slotModal, setSlotModal] = useState(null);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [reschedulingFrom, setReschedulingFrom] = useState(null); // { date, time, entryId, studentId } | null
  const companyStudents = useMemo(() => students.filter((s) => s.category === 'company'), [students]);
  const skipSave = useRef(true);

  useEffect(() => {
    (async () => {
      const [s, c, a, p, fp, st, id] = await Promise.all([
        loadKey('students', null, true),
        loadKey('classLog', null, true),
        loadKey('assessments', null, true),
        loadKey('payments', null, true),
        loadKey('familyPools', null, true),
        loadKey('settings', null, true),
        loadKey('myIdentity', null, false),
      ]);
      if (s) setStudents(s);
      if (c) setClassLog(c);
      if (a) setAssessments(a);
      if (p) setPayments(p);
      if (fp) setFamilyPools(fp);
      setSettings(st);
      setIdentity(id || null);
      setLoaded(true);
    })();
  }, []);

  // Everyone (teacher + every student) is reading/writing the same Supabase rows, so poll
  // periodically to pick up whatever anyone else just booked, paid, or edited. This is a simple
  // "check every few seconds" approach rather than true real-time push — good enough for a small
  // tutoring practice; if bookings ever feel laggy, Supabase's Realtime feature could replace this.
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(async () => {
      const [s, c, a, p, fp, st] = await Promise.all([
        loadKey('students', null, true),
        loadKey('classLog', null, true),
        loadKey('assessments', null, true),
        loadKey('payments', null, true),
        loadKey('familyPools', null, true),
        loadKey('settings', null, true),
      ]);
      if (s) setStudents(s);
      if (c) setClassLog(c);
      if (a) setAssessments(a);
      if (p) setPayments(p);
      if (fp) setFamilyPools(fp);
      if (st) setSettings(st);
    }, 12000);
    return () => clearInterval(interval);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (skipSave.current) { skipSave.current = false; return; }
    saveKey('students', students, true);
  }, [students, loaded]);
  useEffect(() => { if (loaded) saveKey('classLog', classLog, true); }, [classLog, loaded]);
  useEffect(() => { if (loaded) saveKey('assessments', assessments, true); }, [assessments, loaded]);
  useEffect(() => { if (loaded) saveKey('payments', payments, true); }, [payments, loaded]);
  useEffect(() => { if (loaded) saveKey('familyPools', familyPools, true); }, [familyPools, loaded]);

  const studentById = useMemo(() => { const m = {}; students.forEach((s) => (m[s.id] = s)); return m; }, [students]);
  const filteredSlots = useMemo(() => {
    const f = TIME_FILTERS.find((x) => x.id === timeFilter);
    return ALL_SLOTS.filter((t) => {
      const m = hhmmToMinutes(t);
      return f.ranges.some(([start, end]) => m >= start && m < end);
    });
  }, [timeFilter]);

  const getEntryAt = (date, time) => (classLog[date] || []).find((e) => e.chinaTime === time);

  // resolves the actual lesson-count pool for a student: their own record, or a shared family pool
  const getEffectiveLessons = useCallback((student) => {
    if (!student) return null;
    if (student.category === 'family' && student.familyPoolId) {
      const pool = familyPools.find((p) => p.id === student.familyPoolId);
      return pool ? pool.lessonsRemaining : null;
    }
    return student.lessonsRemaining;
  }, [familyPools]);

  const applyStatusDelta = useCallback((studentId, oldStatus, newStatus) => {
    const student = studentById[studentId];
    if (!student || student.category === 'company') return;
    const delta = COST[newStatus] - COST[oldStatus];
    if (delta === 0) return;
    if (student.category === 'family' && student.familyPoolId) {
      setFamilyPools((prev) => prev.map((p) => (p.id === student.familyPoolId ? { ...p, lessonsRemaining: Math.round((p.lessonsRemaining - delta) * 100) / 100 } : p)));
    } else if (typeof student.lessonsRemaining === 'number') {
      setStudents((prev) => prev.map((s) => (s.id === student.id ? { ...s, lessonsRemaining: Math.round((s.lessonsRemaining - delta) * 100) / 100 } : s)));
    }
  }, [studentById]);

  // safe single booking: re-reads latest shared data right before writing
  const bookDayEntry = useCallback(async (date, time, studentId, extra) => {
    const latest = await loadKey('classLog', classLog, true);
    const list = latest[date] || [];
    if (list.find((e) => e.chinaTime === time)) {
      setClassLog(latest);
      return { ok: false };
    }
    const entry = { id: uid('ent'), date, chinaTime: time, studentId, status: 'scheduled', feedback: null, ...(extra || {}) };
    const next = { ...latest, [date]: [...list, entry].sort((a, b) => a.chinaTime.localeCompare(b.chinaTime)) };
    setClassLog(next);
    await saveKey('classLog', next, true);
    return { ok: true };
  }, [classLog]);

  // batch booking: ONE read + ONE write for all selected slots, so nothing silently drops
  const batchBookEntries = useCallback(async (cells, studentId) => {
    const latest = await loadKey('classLog', classLog, true);
    const next = { ...latest };
    let booked = 0, skipped = 0;
    for (const { date, time } of cells) {
      const list = next[date] || [];
      if (list.find((e) => e.chinaTime === time)) { skipped += 1; continue; }
      const entry = { id: uid('ent'), date, chinaTime: time, studentId, status: 'scheduled', feedback: null };
      next[date] = [...list, entry].sort((a, b) => a.chinaTime.localeCompare(b.chinaTime));
      booked += 1;
    }
    setClassLog(next);
    await saveKey('classLog', next, true);
    return { booked, skipped };
  }, [classLog]);

  const removeDayEntry = (date, entryId, studentId, status) => {
    applyStatusDelta(studentId, status, 'scheduled');
    setClassLog((prev) => ({ ...prev, [date]: (prev[date] || []).filter((e) => e.id !== entryId) }));
  };
  const setEntryStatus = (date, entry, newStatus) => {
    applyStatusDelta(entry.studentId, entry.status, newStatus);
    setClassLog((prev) => ({ ...prev, [date]: (prev[date] || []).map((e) => (e.id === entry.id ? { ...e, status: newStatus } : e)) }));
  };

  // Counts how many free reschedules a student has already used in the current calendar month,
  // by looking for entries tagged with a rescheduledAt timestamp from that month.
  const countReschedulesThisMonth = useCallback((studentId) => {
    const now = new Date();
    let count = 0;
    Object.values(classLog).forEach((list) => {
      list.forEach((e) => {
        if (e.studentId !== studentId || !e.rescheduledAt) return;
        const d = new Date(e.rescheduledAt);
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) count += 1;
      });
    });
    return count;
  }, [classLog]);

  // Moves a booking from its old slot to a new one. Always free (no lesson deducted) — eligibility
  // for whether this was allowed (the 2-per-month quota) is checked before this is ever called.
  const commitReschedule = useCallback(async (from, toDate, toTime) => {
    const res = await bookDayEntry(toDate, toTime, from.studentId, { rescheduledAt: Date.now() });
    if (!res.ok) return { ok: false };
    removeDayEntry(from.date, from.entryId, from.studentId, 'scheduled');
    return { ok: true };
  }, [bookDayEntry]);

  // Batch-cancels a specific list of {date, time} slots — only ones still "Scheduled" are touched;
  // anything already Finished/Absent/etc. is skipped rather than removed, since bulk-undoing
  // completed lesson history is a much easier mistake to make by accident than bulk-cancelling
  // lessons that haven't happened yet.
  const batchCancelEntries = useCallback(async (cells) => {
    const latest = await loadKey('classLog', classLog, true);
    const next = { ...latest };
    let cancelled = 0, skipped = 0;
    const refunds = [];
    for (const { date, time } of cells) {
      const list = next[date] || [];
      const entry = list.find((e) => e.chinaTime === time);
      if (!entry || entry.status !== 'scheduled') { skipped += 1; continue; }
      next[date] = list.filter((e) => e.id !== entry.id);
      refunds.push({ studentId: entry.studentId, status: entry.status });
      cancelled += 1;
    }
    refunds.forEach(({ studentId, status }) => applyStatusDelta(studentId, status, 'scheduled'));
    setClassLog(next);
    await saveKey('classLog', next, true);
    return { cancelled, skipped };
  }, [classLog, applyStatusDelta]);

  // Cancels every still-"Scheduled" booking for one student within the given week's dates.
  const cancelStudentWeek = useCallback((weekDates, studentId) => {
    const cells = [];
    weekDates.forEach((date) => {
      (classLog[date] || []).forEach((e) => {
        if (e.studentId === studentId && e.status === 'scheduled') cells.push({ date, time: e.chinaTime });
      });
    });
    return batchCancelEntries(cells);
  }, [classLog, batchCancelEntries]);

  // Copies every booking from the week starting 7 days before weekStart into the week starting
  // at weekStart — same weekday, same time, same student, always as a fresh "Scheduled" entry
  // (regardless of whatever status the original ended up with). Slots already booked in the
  // target week are left alone rather than overwritten.
  const copyPreviousWeek = useCallback(async (weekStart) => {
    const latest = await loadKey('classLog', classLog, true);
    const next = { ...latest };
    let copied = 0, skipped = 0;
    for (let i = 0; i < 7; i++) {
      const sourceDate = addDays(weekStart, i - 7);
      const targetDate = addDays(weekStart, i);
      const sourceList = latest[sourceDate] || [];
      const targetList = next[targetDate] || [];
      const targetTimes = new Set(targetList.map((e) => e.chinaTime));
      const additions = [];
      sourceList.forEach((e) => {
        if (targetTimes.has(e.chinaTime)) { skipped += 1; return; }
        additions.push({ id: uid('ent'), date: targetDate, chinaTime: e.chinaTime, studentId: e.studentId, status: 'scheduled', feedback: null });
        targetTimes.add(e.chinaTime);
        copied += 1;
      });
      if (additions.length) next[targetDate] = [...targetList, ...additions].sort((a, b) => a.chinaTime.localeCompare(b.chinaTime));
    }
    setClassLog(next);
    await saveKey('classLog', next, true);
    return { copied, skipped };
  }, [classLog]);
  const saveFeedback = (date, entryId, feedback) => {
    setClassLog((prev) => ({ ...prev, [date]: (prev[date] || []).map((e) => (e.id === entryId ? { ...e, feedback } : e)) }));
  };

  const addStudent = (data) => setStudents((prev) => [...prev, { id: uid('stu'), color: PALETTE[prev.length % PALETTE.length], ageGroup: 'adult', age: '', nationality: '', contact: '', familyPoolId: null, homeTz: 'ph', pin: '', ...data }]);
  const updateStudent = (id, patch) => setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const deleteStudent = (id) => setStudents((prev) => prev.filter((s) => s.id !== id));

  const addFamilyPool = (name, rate, lessonsRemaining) => {
    const pool = { id: uid('pool'), name, rate: Number(rate) || 0, lessonsRemaining: Number(lessonsRemaining) || 0 };
    setFamilyPools((prev) => [...prev, pool]);
    return pool;
  };
  const updateFamilyPool = (id, patch) => setFamilyPools((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const findOrCreateStudent = (name, currentStudents) => {
    const existing = currentStudents.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (existing) return { student: existing, list: currentStudents };
    const created = { id: uid('stu'), name, category: 'company', rate: null, lessonsRemaining: null, color: PALETTE[currentStudents.length % PALETTE.length], ageGroup: 'adult', age: '', nationality: '', contact: '', familyPoolId: null, homeTz: 'ph', pin: '' };
    return { student: created, list: [...currentStudents, created] };
  };

  const addAssessment = (studentId, scores) => {
    const values = ASSESSMENT_SKILLS.map((s) => Number(scores[s.key]) || 0);
    const average = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    const level = levelForScore(average).label;
    const record = { id: uid('assess'), date: toDateStr(new Date()), scores, average, level };
    setAssessments((prev) => ({ ...prev, [studentId]: [record, ...(prev[studentId] || [])] }));
  };

  const addPayment = (studentId, amount, lessonsPurchased, note, date) => {
    const record = { id: uid('pay'), date: date || toDateStr(new Date()), amount: Number(amount) || 0, lessonsPurchased: Number(lessonsPurchased) || 0, note: note || '' };
    setPayments((prev) => ({ ...prev, [studentId]: [record, ...(prev[studentId] || [])] }));
    if (record.lessonsPurchased > 0) {
      const student = studentById[studentId];
      if (student && student.category === 'family' && student.familyPoolId) {
        setFamilyPools((prev) => prev.map((p) => (p.id === student.familyPoolId ? { ...p, lessonsRemaining: Math.round((p.lessonsRemaining + record.lessonsPurchased) * 100) / 100 } : p)));
      } else {
        setStudents((prev) => prev.map((s) => (s.id === studentId && typeof s.lessonsRemaining === 'number' ? { ...s, lessonsRemaining: Math.round((s.lessonsRemaining + record.lessonsPurchased) * 100) / 100 } : s)));
      }
    }
  };

  // Deleting a payment reverses whatever lessons it added, same as un-doing addPayment, then
  // removes the record itself — handy for clearing out test entries.
  const deletePayment = (studentId, paymentId) => {
    const record = (payments[studentId] || []).find((p) => p.id === paymentId);
    if (!record) return;
    if (record.lessonsPurchased > 0) {
      const student = studentById[studentId];
      if (student && student.category === 'family' && student.familyPoolId) {
        setFamilyPools((prev) => prev.map((p) => (p.id === student.familyPoolId ? { ...p, lessonsRemaining: Math.round((p.lessonsRemaining - record.lessonsPurchased) * 100) / 100 } : p)));
      } else {
        setStudents((prev) => prev.map((s) => (s.id === studentId && typeof s.lessonsRemaining === 'number' ? { ...s, lessonsRemaining: Math.round((s.lessonsRemaining - record.lessonsPurchased) * 100) / 100 } : s)));
      }
    }
    setPayments((prev) => ({ ...prev, [studentId]: (prev[studentId] || []).filter((p) => p.id !== paymentId) }));
  };

  const updateSettings = (patch) => {
    setSettings((prev) => {
      const next = { ...(prev || {}), ...patch };
      saveKey('settings', next, true);
      return next;
    });
  };

  // Danger Zone — deliberately simple resets. Clearing students while keeping bookings/payments
  // around can leave those pointing at a student that no longer exists, so the UI warns about that;
  // "Clear everything" avoids the issue entirely by wiping all of it together.
  const clearStudents = () => setStudents([]);
  const clearBookings = () => setClassLog({});
  const clearPayments = () => setPayments({});
  const clearAssessments = () => setAssessments({});
  const clearFamilyPools = () => setFamilyPools([]);
  const clearEverything = () => {
    setStudents([]);
    setClassLog({});
    setPayments({});
    setAssessments({});
    setFamilyPools([]);
  };

  // Restoring a backup file just sets each piece of state back from the file — the existing
  // save-to-Supabase effects (further down) pick up the change automatically, same as any other edit.
  const restoreAll = (data) => {
    if (data.students) setStudents(data.students);
    if (data.classLog) setClassLog(data.classLog);
    if (data.payments) setPayments(data.payments);
    if (data.assessments) setAssessments(data.assessments);
    if (data.familyPools) setFamilyPools(data.familyPools);
    if (data.settings) updateSettings(data.settings);
  };

  const handleSetTeacher = async (newPasscode) => {
    if (newPasscode) {
      const next = { ...(settings || {}), teacherPasscode: newPasscode };
      setSettings(next);
      await saveKey('settings', next, true);
    }
    const id = { role: 'teacher' };
    setIdentity(id);
    await saveKey('myIdentity', id, false);
  };
  const handleSetStudent = async (studentId) => {
    const id = { role: 'student', studentId };
    setIdentity(id);
    await saveKey('myIdentity', id, false);
  };
  const handleSetRepresentative = async () => {
    const id = { role: 'representative' };
    setIdentity(id);
    await saveKey('myIdentity', id, false);
  };
  const handleSwitchUser = async () => {
    await deleteKey('myIdentity', false);
    setIdentity(null);
    setActiveTab('schedule');
  };

  if (identity === undefined || !loaded) {
    return <div className="min-h-screen w-full" style={{ backgroundColor: INK }} />;
  }
  if (identity === null) {
    return <RoleGate students={students} settings={settings} onSetTeacher={handleSetTeacher} onSetStudent={handleSetStudent} onSetRepresentative={handleSetRepresentative} />;
  }

  const isTeacher = identity.role === 'teacher';
  const isRep = identity.role === 'representative';
  const myStudentId = identity.studentId;
  const tabs = isTeacher
    ? [
        { id: 'schedule', label: 'Schedule', icon: CalendarDays },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'progress', label: 'Progress', icon: TrendingUp },
        { id: 'billing', label: 'Billing', icon: FileText },
        { id: 'reports', label: 'Reports', icon: Download },
      ]
    : isRep
    ? [{ id: 'schedule', label: 'Schedule', icon: CalendarDays }]
    : [
        { id: 'schedule', label: 'Schedule', icon: CalendarDays },
        { id: 'progress', label: 'My Progress', icon: TrendingUp },
      ];

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: INK, color: TEXT, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">

        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">ESL Console</h1>
          {isTeacher && <p className="text-sm" style={{ color: MUTED }}>Book, teach, note, repeat.</p>}
        </div>

        <div className="flex items-center justify-between mb-6">
          <Pill color={isTeacher ? ACCENT : isRep ? '#7C9FD9' : '#8FC98F'}>{isTeacher ? 'Teacher' : isRep ? 'Company Representative' : `Student · ${studentById[myStudentId]?.name || ''}`}</Pill>
          <button onClick={handleSwitchUser} className="flex items-center gap-1 text-xs" style={{ color: MUTED }}><LogOut size={12} /> Switch user</button>
        </div>

        <div className="flex gap-2 mb-6 border-b overflow-x-auto" style={{ borderColor: BORDER }}>
          {tabs.map((t) => {
            const Icon = t.icon; const isActive = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium -mb-px border-b-2 whitespace-nowrap"
                style={{ borderColor: isActive ? ACCENT : 'transparent', color: isActive ? ACCENT : MUTED }}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'schedule' && (
          <ScheduleTab
            isTeacher={isTeacher} isRep={isRep} myStudentId={myStudentId} myStudent={studentById[myStudentId]} companyStudents={companyStudents}
            view={view} setView={setView}
            selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            timeFilter={timeFilter} setTimeFilter={setTimeFilter}
            filteredSlots={filteredSlots}
            displayTz={displayTz} compareTz={compareTz} setCompareTz={setCompareTz}
            classLog={classLog}
            getEntryAt={getEntryAt}
            studentById={studentById} students={students}
            setSlotModal={setSlotModal}
            bookDayEntry={bookDayEntry}
            batchBookEntries={batchBookEntries}
            copyPreviousWeek={copyPreviousWeek}
            batchCancelEntries={batchCancelEntries}
            cancelStudentWeek={cancelStudentWeek}
            reschedulingFrom={reschedulingFrom} setReschedulingFrom={setReschedulingFrom} commitReschedule={commitReschedule}
          />
        )}
        {activeTab === 'students' && isTeacher && (
          <StudentsTab students={students} assessments={assessments} familyPools={familyPools}
            addStudent={addStudent} updateStudent={updateStudent} deleteStudent={deleteStudent}
            addFamilyPool={addFamilyPool} updateFamilyPool={updateFamilyPool} getEffectiveLessons={getEffectiveLessons} />
        )}
        {activeTab === 'progress' && !isRep && (
          <ProgressTab students={students} classLog={classLog} assessments={assessments} addAssessment={addAssessment}
            restrictedStudentId={isTeacher ? null : myStudentId} />
        )}
        {activeTab === 'billing' && isTeacher && (
          <BillingTab students={students} classLog={classLog} studentById={studentById} payments={payments} assessments={assessments} familyPools={familyPools} addPayment={addPayment} deletePayment={deletePayment} settings={settings} updateSettings={updateSettings}
            restoreAll={restoreAll}
            clearStudents={clearStudents} clearBookings={clearBookings} clearPayments={clearPayments} clearAssessments={clearAssessments} clearFamilyPools={clearFamilyPools} clearEverything={clearEverything} />
        )}
        {activeTab === 'reports' && isTeacher && <ReportsTab classLog={classLog} studentById={studentById} />}
      </div>

      {slotModal && (
        <SlotModal
          ctx={slotModal} isTeacher={isTeacher} isRep={isRep} myStudentId={myStudentId} companyStudents={companyStudents}
          displayTz={(isTeacher || isRep) ? displayTz : (DISPLAY_TZ_OPTIONS.find((o) => o.id === (studentById[myStudentId]?.homeTz || 'ph')) || DISPLAY_TZ_OPTIONS[0])}
          compareTz={(isTeacher || isRep) ? compareTz : null}
          students={students} studentById={studentById}
          entry={getEntryAt(slotModal.date, slotModal.time)}
          onClose={() => setSlotModal(null)}
          onBookDay={async (studentId) => { const res = await bookDayEntry(slotModal.date, slotModal.time, studentId); if (!res.ok) alert('Sorry, that slot was just booked. Please pick another.'); setSlotModal(null); }}
          onStatus={(status) => setEntryStatus(slotModal.date, getEntryAt(slotModal.date, slotModal.time), status)}
          onRemoveDay={() => { const e = getEntryAt(slotModal.date, slotModal.time); removeDayEntry(slotModal.date, e.id, e.studentId, e.status); setSlotModal(null); }}
          onOpenFeedback={() => { const e = getEntryAt(slotModal.date, slotModal.time); setFeedbackTarget({ date: slotModal.date, entryId: e.id }); setSlotModal(null); }}
          reschedulesUsed={countReschedulesThisMonth(myStudentId)}
          onReschedule={() => {
            const e = getEntryAt(slotModal.date, slotModal.time);
            setReschedulingFrom({ date: slotModal.date, time: slotModal.time, entryId: e.id, studentId: e.studentId });
            setSlotModal(null);
          }}
        />
      )}

      {feedbackTarget && (() => {
        const entry = (classLog[feedbackTarget.date] || []).find((e) => e.id === feedbackTarget.entryId);
        const student = entry ? studentById[entry.studentId] : null;
        const levelBucket = student ? currentLevelBucket(assessments, student.id) : 'beginner';
        return (
          <FeedbackModal
            entry={entry} student={student} readOnly={!isTeacher} levelBucket={levelBucket}
            onClose={() => setFeedbackTarget(null)}
            onSave={(feedback) => { saveFeedback(feedbackTarget.date, feedbackTarget.entryId, feedback); setFeedbackTarget(null); }}
          />
        );
      })()}
    </div>
  );
}

/* ---------------- Schedule tab ---------------- */

function ScheduleTab({ isTeacher, isRep, myStudentId, myStudent, companyStudents, view, setView, selectedDate, setSelectedDate, timeFilter, setTimeFilter, filteredSlots, displayTz, compareTz, setCompareTz, classLog, getEntryAt, studentById, students, setSlotModal, bookDayEntry, batchBookEntries, copyPreviousWeek, batchCancelEntries, cancelStudentWeek, reschedulingFrom, setReschedulingFrom, commitReschedule }) {
  const isToday = selectedDate === toDateStr(new Date());
  const monday = mondayOf(selectedDate);
  const weekDates = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i));

  // teacher and reps see PH/CN with an optional compare column; a plain student's primary column
  // is their own home time zone, with no second column to compare against
  const primaryTz = (isTeacher || isRep) ? displayTz : (DISPLAY_TZ_OPTIONS.find((o) => o.id === (myStudent?.homeTz || 'ph')) || DISPLAY_TZ_OPTIONS[0]);
  const secondaryTz = (isTeacher || isRep) ? compareTz : null;

  const doReschedule = async (toDate, toTime) => {
    const res = await commitReschedule(reschedulingFrom, toDate, toTime);
    setReschedulingFrom(null);
    if (res.ok) alert('Your lesson has been moved to the new time.');
    else alert('Sorry, that slot was just taken. Please pick a different one.');
  };

  return (
    <div>
      {reschedulingFrom && !isTeacher && !isRep && (
        <div className="mb-4 rounded-xl p-3 flex items-center gap-3 flex-wrap" style={{ backgroundColor: PAPER_LIGHT, border: `1px solid ${ACCENT}` }}>
          <CalendarDays size={16} style={{ color: ACCENT }} />
          <span className="text-sm">Rescheduling your lesson from {prettyDate(reschedulingFrom.date)} {slotRangeLabel(reschedulingFrom.time)} — click an open slot below to move it there.</span>
          <div className="flex-1" />
          <Btn onClick={() => setReschedulingFrom(null)}>Cancel rescheduling</Btn>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          {['day', 'week'].map((v) => (
            <button key={v} onClick={() => setView(v)} className="px-3 py-1.5 text-sm font-medium capitalize"
              style={{ backgroundColor: view === v ? ACCENT : PAPER, color: view === v ? '#231506' : MUTED }}>{v}</button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Btn onClick={() => setSelectedDate(addDays(selectedDate, view === 'day' ? -1 : -7))}><ChevronLeft size={15} /></Btn>
          <div className="text-sm font-medium text-center" style={{ minWidth: '10rem' }}>
            {view === 'day' ? prettyDate(selectedDate) : `${prettyDate(weekDates[0])} – ${prettyDate(weekDates[6])}`}
          </div>
          <Btn onClick={() => setSelectedDate(addDays(selectedDate, view === 'day' ? 1 : 7))}><ChevronRight size={15} /></Btn>
          {!isToday && <Btn variant="accent" onClick={() => setSelectedDate(toDateStr(new Date()))}>Today</Btn>}
        </div>

        <div className="flex-1" />
        {(isTeacher || isRep) && (
          <label className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
            Compare with:
            <select value={compareTz ? compareTz.id : ''} onChange={(e) => setCompareTz(DISPLAY_TZ_OPTIONS.find((o) => o.id === e.target.value) || null)}
              className="rounded-md px-2 py-1 text-xs outline-none" style={{ backgroundColor: PAPER_LIGHT, border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="">None (PH time only)</option>
              {DISPLAY_TZ_OPTIONS.filter((o) => o.id !== 'ph').map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {TIME_FILTERS.map((f) => (
          <button key={f.id} onClick={() => setTimeFilter(f.id)} className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: timeFilter === f.id ? ACCENT : PAPER_LIGHT, color: timeFilter === f.id ? '#231506' : MUTED, border: `1px solid ${timeFilter === f.id ? ACCENT : BORDER}` }}>
            {f.label}
          </button>
        ))}
      </div>

      {view === 'day' ? (
        <DayGrid date={selectedDate} slots={filteredSlots} displayTz={primaryTz} compareTz={secondaryTz} getEntryAt={getEntryAt} studentById={studentById} setSlotModal={setSlotModal} isTeacher={isTeacher} isRep={isRep} myStudentId={myStudentId} reschedulingFrom={reschedulingFrom} onRescheduleTo={doReschedule} />
      ) : (
        <WeekGrid weekDates={weekDates} slots={filteredSlots} displayTz={primaryTz} compareTz={secondaryTz} getEntryAt={getEntryAt} studentById={studentById} students={students} companyStudents={companyStudents} setSlotModal={setSlotModal} batchBookEntries={batchBookEntries} copyPreviousWeek={copyPreviousWeek} batchCancelEntries={batchCancelEntries} cancelStudentWeek={cancelStudentWeek} isTeacher={isTeacher} isRep={isRep} myStudentId={myStudentId} reschedulingFrom={reschedulingFrom} onRescheduleTo={doReschedule} />
      )}
    </div>
  );
}

function DayGrid({ date, slots, displayTz, compareTz, getEntryAt, studentById, setSlotModal, isTeacher, isRep, myStudentId, reschedulingFrom, onRescheduleTo }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      {slots.map((time) => {
        const entry = getEntryAt(date, time);
        const student = entry ? studentById[entry.studentId] : null;
        const cat = student ? CATEGORY_META[student.category] : null;
        const isMine = entry && entry.studentId === myStudentId;
        const repCanSee = isRep && student?.category === 'company';
        const hideName = !isTeacher && entry && !isMine && !repCanSee;
        const isRescheduleOrigin = reschedulingFrom && reschedulingFrom.date === date && reschedulingFrom.time === time;
        const isReschedulable = reschedulingFrom && !entry && !isRescheduleOrigin;
        const handleClick = () => {
          if (reschedulingFrom) {
            if (isReschedulable) onRescheduleTo(date, time);
            return;
          }
          setSlotModal({ date, time });
        };
        return (
          <div key={time} onClick={handleClick}
            className="flex items-center gap-3 px-4 py-2 cursor-pointer"
            style={{
              backgroundColor: isRescheduleOrigin ? '#3a2f1e' : (isReschedulable ? '#1E2E3A' : (isMine ? '#1E3A2A' : (entry ? PAPER_LIGHTER : PAPER))),
              borderTop: `1px solid ${BORDER}`,
              borderLeft: isMine ? '3px solid #7FCB7F' : (isReschedulable ? '3px solid ' + ACCENT : '3px solid transparent'),
              opacity: reschedulingFrom && entry && !isRescheduleOrigin ? 0.5 : 1,
            }}>
            <div className="w-24 font-mono text-sm">{displaySlotLabel(date, time, displayTz)}</div>
            {compareTz && (
              <div className="w-24 font-mono text-xs" style={{ color: MUTED }}>
                {displaySlotLabel(date, time, compareTz)} <span style={{ fontSize: '10px' }}>{compareTz.label}</span>
              </div>
            )}
            {entry ? (
              <>
                {!hideName && student && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: student.color }} />}
                {isMine && <Check size={14} style={{ color: '#7FCB7F' }} />}
                <span className="font-medium" style={isMine ? { color: '#7FCB7F' } : undefined}>{hideName ? 'Booked' : (student ? student.name : 'Unknown')}</span>
                {!hideName && cat && <Pill color={cat.color}>{cat.label}</Pill>}
                {isTeacher && <Pill color={STATUS_META[entry.status].color}>{STATUS_META[entry.status].label}</Pill>}
                {isRescheduleOrigin && <span className="text-xs" style={{ color: ACCENT }}>← moving this one</span>}
              </>
            ) : (
              <span className="text-sm" style={{ color: isReschedulable ? ACCENT : MUTED }}>{isReschedulable ? 'Click to move your lesson here' : 'Open — click to book'}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StudentPicker({ students, value, onChange, placeholder = 'Search student…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = students.find((s) => s.id === value);

  useEffect(() => {
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = students.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={wrapRef}>
      <input
        value={open ? query : (selected ? selected.name : '')}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(''); setOpen(true); }}
        placeholder={placeholder}
        className="w-full rounded-md px-2 py-1.5 text-sm outline-none"
        style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-md shadow-lg" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
          {value && (
            <div onClick={() => { onChange(''); setQuery(''); setOpen(false); }} className="px-2 py-1.5 text-xs cursor-pointer" style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>✕ Clear selection</div>
          )}
          {filtered.length === 0 && <div className="px-2 py-1.5 text-xs" style={{ color: MUTED }}>No matches</div>}
          {filtered.map((s) => (
            <div key={s.id} onClick={() => { onChange(s.id); setQuery(''); setOpen(false); }}
              className="px-2 py-1.5 text-sm cursor-pointer flex items-center gap-2" style={{ color: TEXT, backgroundColor: s.id === value ? PAPER_LIGHTER : 'transparent' }}>
              <span className="inline-block rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: s.color || MUTED }} />
              <span className="flex-1">{s.name}</span>
              <span className="text-xs shrink-0" style={{ color: CATEGORY_META[s.category]?.color || MUTED }}>{CATEGORY_META[s.category]?.label}</span>
              {s.id === value && <Check size={14} style={{ color: ACCENT }} className="shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeekGrid({ weekDates, slots, displayTz, compareTz, getEntryAt, studentById, students, companyStudents, setSlotModal, batchBookEntries, batchCancelEntries, cancelStudentWeek, copyPreviousWeek, isTeacher, isRep, myStudentId, reschedulingFrom, onRescheduleTo }) {
  const [bookAs, setBookAs] = useState('');
  const [selfSelecting, setSelfSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [copying, setCopying] = useState(false);
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelSelected, setCancelSelected] = useState(() => new Set());
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelStudentPick, setCancelStudentPick] = useState('');
  const [cancelingStudentWeek, setCancelingStudentWeek] = useState(false);

  const cellKey = (date, time) => `${date}|${time}`;
  const bookingActive = (isTeacher || isRep) ? !!bookAs : selfSelecting;
  const bookingTarget = (isTeacher || isRep) ? bookAs : myStudentId;
  const pickerStudents = isTeacher ? students : companyStudents;

  const copyWeek = async () => {
    if (!window.confirm(`Copy every booking from ${prettyDate(addDays(weekDates[0], -7))} – ${prettyDate(addDays(weekDates[6], -7))} into this week (${prettyDate(weekDates[0])} – ${prettyDate(weekDates[6])})? Slots already booked this week will be left alone.`)) return;
    setCopying(true);
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), 15000));
      const { copied, skipped } = await Promise.race([copyPreviousWeek(weekDates[0]), timeout]);
      if (copied === 0 && skipped === 0) {
        alert(`Nothing to copy — last week (${prettyDate(addDays(weekDates[0], -7))} – ${prettyDate(addDays(weekDates[6], -7))}) has no bookings in it.`);
      } else {
        alert(`Copied ${copied} booking(s) from last week.${skipped > 0 ? ` ${skipped} were skipped because that slot was already booked.` : ''}`);
      }
    } catch (e) {
      console.error('copyWeek failed', e);
      if (e && e.message === 'timed out') {
        alert('This is taking much longer than it should — the connection to the database may be having trouble. Please check your internet connection and try again.');
      } else {
        alert('Something went wrong copying last week\u2019s schedule. Please try again in a moment.');
      }
    } finally {
      setCopying(false);
    }
  };

  const toggleCell = (date, time) => {
    const entry = getEntryAt(date, time);
    if (reschedulingFrom) {
      const isOrigin = reschedulingFrom.date === date && reschedulingFrom.time === time;
      if (!entry && !isOrigin) onRescheduleTo(date, time);
      return;
    }
    if (cancelMode) {
      if (!entry || entry.status !== 'scheduled') return; // only upcoming, unmodified bookings are bulk-cancellable
      const key = cellKey(date, time);
      setCancelSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
      return;
    }
    if (entry) { setSlotModal({ date, time }); return; }
    if (!bookingActive) { setSlotModal({ date, time }); return; }
    const key = cellKey(date, time);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const commitBatch = async () => {
    if (!bookingTarget || selected.size === 0) return;
    setBusy(true);
    const cells = [...selected].map((key) => { const [date, time] = key.split('|'); return { date, time }; });
    const { booked, skipped } = await batchBookEntries(cells, bookingTarget);
    setBusy(false);
    setSelected(new Set());
    if (skipped > 0) alert(`Booked ${booked} slot(s). ${skipped} were already taken and were skipped.`);
  };

  const withTimeout = (promise) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), 15000))]);

  const commitCancel = async () => {
    if (cancelSelected.size === 0) return;
    if (!window.confirm(`Cancel ${cancelSelected.size} selected booking(s)? This cannot be undone.`)) return;
    setCancelBusy(true);
    try {
      const cells = [...cancelSelected].map((key) => { const [date, time] = key.split('|'); return { date, time }; });
      const { cancelled, skipped } = await withTimeout(batchCancelEntries(cells));
      alert(`Cancelled ${cancelled} booking(s).${skipped > 0 ? ` ${skipped} could not be cancelled (already changed by someone else).` : ''}`);
      setCancelSelected(new Set());
      setCancelMode(false);
    } catch (e) {
      console.error('commitCancel failed', e);
      alert(e && e.message === 'timed out' ? 'This is taking too long — please check your connection and try again.' : 'Something went wrong cancelling those bookings. Please try again.');
    } finally {
      setCancelBusy(false);
    }
  };

  const cancelWholeStudentWeek = async () => {
    if (!cancelStudentPick) return;
    const studentName = studentById[cancelStudentPick]?.name || 'this student';
    if (!window.confirm(`Cancel ALL of ${studentName}'s scheduled bookings for ${prettyDate(weekDates[0])} – ${prettyDate(weekDates[6])}? This cannot be undone.`)) return;
    setCancelingStudentWeek(true);
    try {
      const { cancelled } = await withTimeout(cancelStudentWeek(weekDates, cancelStudentPick));
      alert(cancelled > 0 ? `Cancelled ${cancelled} booking(s) for ${studentName} this week.` : `${studentName} had no scheduled bookings this week to cancel.`);
      setCancelStudentPick('');
    } catch (e) {
      console.error('cancelWholeStudentWeek failed', e);
      alert(e && e.message === 'timed out' ? 'This is taking too long — please check your connection and try again.' : 'Something went wrong. Please try again.');
    } finally {
      setCancelingStudentWeek(false);
    }
  };

  return (
    <div>
      <div className="mb-3 rounded-xl p-3 flex flex-wrap items-center gap-2" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
        {(isTeacher || isRep) ? (
          <>
            <span className="text-sm" style={{ color: MUTED }}>Book as:</span>
            <div className="w-64">
              <StudentPicker students={pickerStudents} value={bookAs} onChange={(id) => { setBookAs(id); clearSelection(); }} placeholder={isRep ? 'Search company student to book as…' : 'Search student to book as…'} />
            </div>
          </>
        ) : (
          <Btn variant={selfSelecting ? 'accent' : 'default'} onClick={() => { setSelfSelecting(!selfSelecting); clearSelection(); }}>
            {selfSelecting ? 'Cancel selecting' : 'Select multiple slots to book'}
          </Btn>
        )}
        {isTeacher && (
          <Btn onClick={copyWeek} disabled={copying}>{copying ? 'Copying…' : 'Copy last week\u2019s schedule'}</Btn>
        )}
        {bookingActive && (
          <>
            <span className="text-xs" style={{ color: MUTED }}>{selected.size} slot(s) selected — click empty cells below to add or remove</span>
            <div className="flex-1" />
            <Btn onClick={clearSelection} disabled={selected.size === 0}>Clear</Btn>
            <Btn variant="accent" onClick={commitBatch} disabled={selected.size === 0 || busy}>{busy ? 'Booking…' : `Book ${selected.size} slot(s)${(isTeacher || isRep) ? '' : ' for me'}`}</Btn>
          </>
        )}
      </div>

      {isTeacher && (
        <div className="mb-3 rounded-xl p-3 flex flex-wrap items-center gap-2" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
          <Btn variant={cancelMode ? 'danger' : 'default'} onClick={() => { setCancelMode(!cancelMode); setCancelSelected(new Set()); }}>
            {cancelMode ? 'Stop cancel-selecting' : 'Cancel multiple bookings'}
          </Btn>
          {cancelMode && (
            <>
              <span className="text-xs" style={{ color: MUTED }}>{cancelSelected.size} selected — click Scheduled bookings below</span>
              <Btn variant="danger" onClick={commitCancel} disabled={cancelSelected.size === 0 || cancelBusy}>{cancelBusy ? 'Cancelling…' : `Cancel ${cancelSelected.size} booking(s)`}</Btn>
            </>
          )}
          <div className="flex-1" />
          <div className="w-56">
            <StudentPicker students={students} value={cancelStudentPick} onChange={setCancelStudentPick} placeholder="Cancel all bookings for…" />
          </div>
          <Btn variant="danger" disabled={!cancelStudentPick || cancelingStudentWeek} onClick={cancelWholeStudentWeek}>{cancelingStudentWeek ? 'Cancelling…' : 'Cancel their week'}</Btn>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${BORDER}` }}>
        <div style={{ minWidth: compareTz ? '920px' : '820px' }}>
          <div className={`grid ${compareTz ? 'grid-cols-9' : 'grid-cols-8'}`} style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="px-2 py-2 text-xs" style={{ color: MUTED }}>{(isTeacher || isRep) ? 'Time (PH/CN)' : `Time (${displayTz.label})`}</div>
            {compareTz && <div className="px-2 py-2 text-xs" style={{ color: MUTED }}>{compareTz.label}</div>}
            {weekDates.map((d, i) => (
              <div key={d} className="px-2 py-2 text-xs font-medium text-center">
                {DAYS_SHORT[i]} <span style={{ color: MUTED }}>{d.slice(5)}</span>
              </div>
            ))}
          </div>
          {slots.map((time) => (
            <div key={time} className={`grid ${compareTz ? 'grid-cols-9' : 'grid-cols-8'}`} style={{ borderTop: `1px solid ${BORDER}` }}>
              <div className="px-2 py-1.5 font-mono text-xs flex items-center" style={{ color: MUTED }}>{displaySlotLabel(weekDates[0], time, displayTz)}</div>
              {compareTz && <div className="px-2 py-1.5 font-mono text-xs flex items-center" style={{ color: MUTED }}>{displaySlotLabel(weekDates[0], time, compareTz)}</div>}
              {weekDates.map((date) => {
                const entry = getEntryAt(date, time);
                const student = entry ? studentById[entry.studentId] : null;
                const isMine = entry && entry.studentId === myStudentId;
                const repCanSee = isRep && student?.category === 'company';
                const hideName = !isTeacher && entry && !isMine && !repCanSee;
                const isSelected = selected.has(cellKey(date, time));
                const isCancelSelected = cancelSelected.has(cellKey(date, time));
                const cancelable = cancelMode && entry && entry.status === 'scheduled';
                const isRescheduleOrigin = reschedulingFrom && reschedulingFrom.date === date && reschedulingFrom.time === time;
                const isReschedulable = reschedulingFrom && !entry && !isRescheduleOrigin;
                return (
                  <div key={date} onClick={() => toggleCell(date, time)}
                    className="px-1.5 py-1.5 text-xs cursor-pointer flex items-center justify-center text-center gap-1"
                    style={{
                      backgroundColor: isRescheduleOrigin ? '#3a2f1e' : (isReschedulable ? '#1E2E3A' : (isCancelSelected ? '#4a1f1f' : (isSelected ? ACCENT + '33' : (isMine ? '#1E3A2A' : (student ? student.color + '22' : 'transparent'))))),
                      borderLeft: isReschedulable ? `2px solid ${ACCENT}` : (isMine ? '2px solid #7FCB7F' : `1px solid ${BORDER}`),
                      outline: isCancelSelected ? `1px solid ${RED}` : (isSelected ? `1px solid ${ACCENT}` : 'none'),
                      opacity: (cancelMode && entry && !cancelable) || (reschedulingFrom && entry && !isRescheduleOrigin) ? 0.5 : 1,
                    }}>
                    {student ? (
                      <span className="flex items-center gap-1" style={isCancelSelected ? { color: RED, fontWeight: 600 } : (isMine ? { color: '#7FCB7F', fontWeight: 600 } : undefined)}>
                        {isMine && <Check size={12} />}
                        {isCancelSelected && <X size={12} />}
                        {hideName ? 'Booked' : student.name}
                      </span>
                    ) : isReschedulable ? <span style={{ color: ACCENT }}>Move here</span> : (isSelected ? <span style={{ color: ACCENT }}>✓</span> : <span style={{ color: BORDER }}>·</span>)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Slot modal ---------------- */

function SlotModal({ ctx, isTeacher, isRep, myStudentId, companyStudents, displayTz, compareTz, students, studentById, entry, onClose, onBookDay, onStatus, onRemoveDay, onOpenFeedback, reschedulesUsed, onReschedule }) {
  const [pick, setPick] = useState('');
  const student = entry ? studentById[entry.studentId] : null;
  const isMine = entry && entry.studentId === myStudentId;
  const repCanSee = isRep && student?.category === 'company';

  if (isRep) {
    return (
      <Modal onClose={onClose}>
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>{prettyDate(ctx.date)}</div>
          <div className="font-mono text-lg">{displaySlotLabel(ctx.date, ctx.time, displayTz)} <span className="text-xs" style={{ color: MUTED }}>PH/CN</span></div>
          {compareTz && <div className="font-mono text-sm" style={{ color: MUTED }}>{displaySlotLabel(ctx.date, ctx.time, compareTz)} {compareTz.label}</div>}
        </div>
        {!entry && (
          <div>
            <div className="text-sm mb-2" style={{ color: MUTED }}>Book a company student into this slot</div>
            <div className="mb-3">
              <StudentPicker students={companyStudents} value={pick} onChange={setPick} placeholder="Search company student…" />
            </div>
            <Btn variant="accent" disabled={!pick} onClick={() => onBookDay(pick)}>Book lesson</Btn>
          </div>
        )}
        {entry && repCanSee && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: student.color }} />
              <span className="font-medium">{student.name}</span>
              <Pill color={CATEGORY_META[student.category].color}>{CATEGORY_META[student.category].label}</Pill>
            </div>
            <Pill color={STATUS_META[entry.status].color}>{STATUS_META[entry.status].label}</Pill>
            {entry.status === 'scheduled' && (
              <div className="mt-3">
                <Btn variant="danger" onClick={onRemoveDay}><Trash2 size={14} /> Cancel this booking</Btn>
              </div>
            )}
          </div>
        )}
        {entry && !repCanSee && <p className="text-sm" style={{ color: MUTED }}>This slot is already booked.</p>}
      </Modal>
    );
  }

  if (!isTeacher) {
    return (
      <Modal onClose={onClose}>
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>{prettyDate(ctx.date)}</div>
          <div className="font-mono text-lg">{displaySlotLabel(ctx.date, ctx.time, displayTz)} <span className="text-xs" style={{ color: MUTED }}>{displayTz.label}</span></div>
          {compareTz && <div className="font-mono text-sm" style={{ color: MUTED }}>{displaySlotLabel(ctx.date, ctx.time, compareTz)} {compareTz.label}</div>}
        </div>
        {!entry && (
          <div>
            <p className="text-sm mb-3" style={{ color: MUTED }}>This slot is open.</p>
            <Btn variant="accent" onClick={() => onBookDay(myStudentId)}>Book this lesson for me</Btn>
          </div>
        )}
        {entry && isMine && (
          <div>
            <p className="text-sm mb-3">This is your lesson.</p>
            {entry.status === 'scheduled' ? (
              <div className="flex flex-col gap-2 items-start">
                <Btn variant="danger" onClick={() => {
                  const hoursLeft = hoursUntilSlot(ctx.date, ctx.time);
                  if (hoursLeft < LATE_CHANGE_HOURS) {
                    if (window.confirm(`This lesson starts in less than ${LATE_CHANGE_HOURS} hours, so cancelling now counts as a late cancellation — 0.5 of a lesson will be deducted from your package, per policy. Cancel anyway?`)) {
                      onStatus('absent');
                    }
                  } else {
                    if (window.confirm('Cancel this lesson? Since it\u2019s more than 24 hours away, this is a free cancellation.')) {
                      onRemoveDay();
                    }
                  }
                }}><Trash2 size={14} /> Cancel my lesson</Btn>
                {reschedulesUsed < FREE_RESCHEDULES_PER_MONTH ? (
                  <Btn onClick={onReschedule}><CalendarDays size={14} /> Reschedule ({FREE_RESCHEDULES_PER_MONTH - reschedulesUsed} free this month)</Btn>
                ) : (
                  <p className="text-xs" style={{ color: MUTED }}>You've used your {FREE_RESCHEDULES_PER_MONTH} free reschedules this month — use Cancel instead if you need to change this lesson.</p>
                )}
              </div>
            ) : (
              <>
                <Pill color={STATUS_META[entry.status].color}>{STATUS_META[entry.status].label}</Pill>
                {entry.feedback && <div className="mt-3"><Btn onClick={onOpenFeedback}>View feedback</Btn></div>}
              </>
            )}
          </div>
        )}
        {entry && !isMine && <p className="text-sm" style={{ color: MUTED }}>This slot is already booked.</p>}
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>{prettyDate(ctx.date)}</div>
        <div className="font-mono text-lg">{displaySlotLabel(ctx.date, ctx.time, displayTz)} <span className="text-xs" style={{ color: MUTED }}>PH/CN</span></div>
        {compareTz && <div className="font-mono text-sm" style={{ color: MUTED }}>{displaySlotLabel(ctx.date, ctx.time, compareTz)} {compareTz.label}</div>}
      </div>

      {!student ? (
        <div>
          <div className="text-sm mb-2" style={{ color: MUTED }}>Book a student into this slot</div>
          <div className="mb-3">
            <StudentPicker students={students} value={pick} onChange={setPick} placeholder="Search student…" />
          </div>
          <Btn variant="accent" disabled={!pick} onClick={() => onBookDay(pick)}>Book lesson</Btn>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: student.color }} />
            <span className="font-medium">{student.name}</span>
            <Pill color={CATEGORY_META[student.category].color}>{CATEGORY_META[student.category].label}</Pill>
          </div>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: MUTED }}>Status</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <button key={key} onClick={() => onStatus(key)} className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: entry.status === key ? meta.color : PAPER_LIGHT, color: entry.status === key ? '#0f1b2a' : meta.color, border: `1px solid ${meta.color}55` }}>
                {meta.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="accent" onClick={onOpenFeedback}><Pencil size={14} /> {entry.feedback ? 'Edit feedback' : 'Add feedback'}</Btn>
            <Btn variant="danger" onClick={onRemoveDay}><Trash2 size={14} /> Unbook this date</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Feedback modal ---------------- */

function emptyFeedback() {
  const perSkillLevel3 = {};
  const perSkillIndex0 = {};
  const perSkillNullPhrase = {};
  SKILLS.forEach((sk) => { perSkillLevel3[sk.key] = 3; perSkillIndex0[sk.key] = 0; perSkillNullPhrase[sk.key] = null; });
  return {
    todayLesson: '', nextLesson: '',
    vocab: ['', '', '', '', '', ''],
    corrections: [{ wrong: '', correct: '' }, { wrong: '', correct: '' }, { wrong: '', correct: '' }],
    levels: perSkillLevel3,
    commentSet: 1,
    phraseChoice: perSkillIndex0,
    addedPhrase: perSkillNullPhrase,
    comment: '',
  };
}

function buildFinalText(entry, student, fb) {
  const lines = [];
  lines.push(`Student's name: ${student ? student.name : ''}`);
  lines.push(`Today's lesson: ${fb.todayLesson}`);
  lines.push(`Next Lesson: ${fb.nextLesson}`);
  lines.push(`Date: ${templateDate(entry.date)}`);
  lines.push('');
  lines.push('Words or sentences to review:');
  fb.vocab.filter((v) => v.trim()).forEach((v, i) => lines.push(`${i + 1}. ${v}`));
  lines.push('');
  lines.push('Corrections:');
  fb.corrections.filter((c) => c.wrong.trim() || c.correct.trim()).forEach((c, i) => { lines.push(`${i + 1}. ✘ ${c.wrong}`); lines.push(`   ✔ ${c.correct}`); });
  lines.push('');
  lines.push("Teacher's comment:");
  lines.push(fb.comment);
  return lines.join('\n');
}

function FeedbackModal({ entry, student, onClose, onSave, readOnly, levelBucket }) {
  const [fb, setFb] = useState(() => ({ ...emptyFeedback(), ageGroup: student?.ageGroup || 'adult', ...(entry?.feedback || {}) }));
  const [finalText, setFinalText] = useState(entry?.feedback?.finalText || '');
  const [copied, setCopied] = useState(false);

  if (!entry) return null;

  const setVocab = (i, val) => setFb((p) => ({ ...p, vocab: p.vocab.map((v, idx) => (idx === i ? val : v)) }));
  const addVocab = () => setFb((p) => ({ ...p, vocab: [...p.vocab, ''] }));
  const setCorrection = (i, key, val) => setFb((p) => ({ ...p, corrections: p.corrections.map((c, idx) => (idx === i ? { ...c, [key]: val } : c)) }));
  const addCorrection = () => setFb((p) => ({ ...p, corrections: [...p.corrections, { wrong: '', correct: '' }] }));
  const setSkillLevel = (key, val) => setFb((p) => ({ ...p, levels: { ...p.levels, [key]: val }, phraseChoice: { ...p.phraseChoice, [key]: 0 } }));
  const setAgeGroup = (val) => setFb((p) => ({ ...p, ageGroup: val }));
  const setCommentSet = (val) => setFb((p) => {
    const resetChoice = {};
    SKILLS.forEach((sk) => { resetChoice[sk.key] = 0; });
    return { ...p, commentSet: val, phraseChoice: resetChoice };
  });
  const setPhraseChoice = (key, idx) => setFb((p) => ({ ...p, phraseChoice: { ...p.phraseChoice, [key]: idx } }));
  const addPhrase = (key) => setFb((p) => {
    const chosenText = PHRASE_VARIANTS[p.ageGroup || 'adult'][key][p.levels[key]][p.commentSet || 1][p.phraseChoice[key]];
    const prevText = p.addedPhrase[key];
    let comment = p.comment;
    if (prevText) comment = comment.replace(prevText, '').replace(/  +/g, ' ').trim();
    comment = (comment ? comment + ' ' : '') + chosenText;
    return { ...p, comment, addedPhrase: { ...p.addedPhrase, [key]: chosenText } };
  });
  const removePhrase = (key) => setFb((p) => {
    const prevText = p.addedPhrase[key];
    if (!prevText) return p;
    const comment = p.comment.replace(prevText, '').replace(/  +/g, ' ').trim();
    return { ...p, comment, addedPhrase: { ...p.addedPhrase, [key]: null } };
  });

  const finalize = () => setFinalText(buildFinalText(entry, student, fb));
  const regenerateComment = () => setFb((p) => ({ ...p, comment: autoGenerateComment(p.levels, p.ageGroup || 'adult', levelBucket, p.commentSet) }));
  const copy = async () => { try { await navigator.clipboard.writeText(finalText); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) {} };
  const save = () => onSave({ ...fb, finalText: finalText || buildFinalText(entry, student, fb) });

  if (readOnly) {
    return (
      <Modal onClose={onClose} wide>
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>Feedback</div>
          <div className="font-medium text-lg">{student?.name} — {templateDate(entry.date)}</div>
        </div>
        {entry.feedback ? (
          <pre className="whitespace-pre-wrap text-xs font-mono" style={{ color: TEXT }}>{entry.feedback.finalText || buildFinalText(entry, student, entry.feedback)}</pre>
        ) : (
          <p className="text-sm" style={{ color: MUTED }}>No feedback added yet.</p>
        )}
        <div className="mt-4"><Btn onClick={onClose}>Close</Btn></div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} wide persistent>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>Feedback</div>
          <div className="font-medium text-lg">{student?.name} — {templateDate(entry.date)}</div>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 shrink-0" style={{ color: MUTED, border: `1px solid ${BORDER}` }} title="Close">
          <X size={16} />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs mb-1" style={{ color: MUTED }}>Today's lesson</div>
          <input value={fb.todayLesson} onChange={(e) => setFb({ ...fb, todayLesson: e.target.value })} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: MUTED }}>Next lesson</div>
          <input value={fb.nextLesson} onChange={(e) => setFb({ ...fb, nextLesson: e.target.value })} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: MUTED }}>Words or sentences to review</div>
        <div className="space-y-1.5">
          {fb.vocab.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs w-4" style={{ color: MUTED }}>{i + 1}.</span>
              <input value={v} onChange={(e) => setVocab(i, e.target.value)} className="flex-1 rounded-md px-2 py-1 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
            </div>
          ))}
        </div>
        <button onClick={addVocab} className="text-xs mt-1.5 flex items-center gap-1" style={{ color: ACCENT }}><Plus size={12} /> Add line</button>
      </div>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: MUTED }}>Corrections</div>
        <div className="space-y-2">
          {fb.corrections.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs w-4" style={{ color: MUTED }}>{i + 1}.</span>
              <span style={{ color: RED }}>✘</span>
              <input value={c.wrong} onChange={(e) => setCorrection(i, 'wrong', e.target.value)} placeholder="what they said" className="flex-1 rounded-md px-2 py-1 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
              <span style={{ color: '#7FCB7F' }}>✔</span>
              <input value={c.correct} onChange={(e) => setCorrection(i, 'correct', e.target.value)} placeholder="corrected version" className="flex-1 rounded-md px-2 py-1 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
            </div>
          ))}
        </div>
        <button onClick={addCorrection} className="text-xs mt-1.5 flex items-center gap-1" style={{ color: ACCENT }}><Plus size={12} /> Add line</button>
      </div>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: MUTED }}>Lesson-wide settings</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs mb-1" style={{ color: MUTED }}>Age bracket (used for feedback tone)</div>
            <select value={fb.ageGroup || 'adult'} onChange={(e) => setAgeGroup(e.target.value)} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="kid">Kid</option>
              <option value="teen">Teen</option>
              <option value="adult">Adult</option>
            </select>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: MUTED }}>Phrase set (more variety, same meaning)</div>
            <select value={fb.commentSet || 1} onChange={(e) => setCommentSet(Number(e.target.value))} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }}>
              {[1, 2, 3].map((s) => <option key={s} value={s}>Set {s}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs mt-1" style={{ color: MUTED }}>Defaults to this student's saved age bracket ({student?.ageGroup || 'adult'}) but you can override it just for this lesson.</p>
      </div>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: MUTED }}>Performance in this lesson — set each skill's own level, pick a phrasing, then add it to the comment</div>
        <div className="space-y-2">
          {SKILLS.map((sk) => (
            <div key={sk.key} className="flex items-center gap-2 flex-wrap">
              <div className="text-xs w-32 shrink-0" style={{ color: MUTED }}>{sk.en}</div>
              <select value={fb.levels[sk.key]} onChange={(e) => setSkillLevel(sk.key, Number(e.target.value))} className="rounded-md px-2 py-1.5 text-xs outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }}>
                {[4, 3, 2, 1].map((tier) => <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>)}
              </select>
              <select value={fb.phraseChoice[sk.key]} onChange={(e) => setPhraseChoice(sk.key, Number(e.target.value))} className="flex-1 rounded-md px-2 py-1.5 text-xs outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT, minWidth: '12rem' }}>
                {PHRASE_VARIANTS[fb.ageGroup || 'adult'][sk.key][fb.levels[sk.key]][fb.commentSet || 1].map((phrase, idx) => <option key={idx} value={idx}>{phrase}</option>)}
              </select>
              <Btn onClick={() => addPhrase(sk.key)}><Plus size={12} /> Add</Btn>
              <Btn variant="danger" onClick={() => removePhrase(sk.key)} disabled={!fb.addedPhrase[sk.key]}><X size={12} /> Remove</Btn>
              {fb.addedPhrase[sk.key] && <span className="text-xs" style={{ color: '#7FCB7F' }}>✔ added</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-y-1">
          <div className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>Teacher's comment</div>
          <button onClick={regenerateComment} className="text-xs flex items-center gap-1" style={{ color: ACCENT }}><Sparkles size={12} /> Surprise me (random, based on level + age above)</button>
        </div>
        <textarea value={fb.comment} onChange={(e) => setFb({ ...fb, comment: e.target.value })} rows={3} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
        <p className="text-xs mt-1" style={{ color: MUTED }}>You can always edit this text by hand too.</p>
      </div>

      {!finalText ? (
        <div className="flex gap-2">
          <Btn variant="accent" onClick={finalize}>Generate message</Btn>
          <Btn onClick={save}>Save without generating</Btn>
        </div>
      ) : (
        <div>
          <textarea value={finalText} onChange={(e) => setFinalText(e.target.value)} rows={10} className="w-full rounded-md px-3 py-2 text-xs font-mono outline-none mb-2" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
          <div className="flex gap-2 flex-wrap">
            <Btn variant="accent" onClick={copy}><Copy size={14} /> {copied ? 'Copied!' : 'Copy message'}</Btn>
            <Btn onClick={save}>Save feedback</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Students tab ---------------- */

function StudentsTab({ students, assessments, familyPools, addStudent, updateStudent, deleteStudent, addFamilyPool, updateFamilyPool, getEffectiveLessons }) {
  const [form, setForm] = useState({ name: '', category: 'company', rate: '', lessonsRemaining: '' });
  const [profileFor, setProfileFor] = useState(null);
  const [showPools, setShowPools] = useState(false);
  const [rosterQuery, setRosterQuery] = useState('');
  const visibleStudents = students.filter((s) => s.name.toLowerCase().includes(rosterQuery.toLowerCase()));

  const submit = () => {
    if (!form.name.trim()) return;
    addStudent({ name: form.name.trim(), category: form.category, rate: form.rate ? Number(form.rate) : null, lessonsRemaining: form.category === 'company' ? null : (form.lessonsRemaining ? Number(form.lessonsRemaining) : 0) });
    setForm({ name: '', category: 'company', rate: '', lessonsRemaining: '' });
  };

  return (
    <div>
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
        <div className="text-sm font-medium mb-3">Add a student</div>
        <div className="grid sm:grid-cols-5 gap-2">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md px-2 py-1.5 text-sm outline-none sm:col-span-2" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="company">Company</option><option value="private">Private</option><option value="family">Family</option>
          </select>
          {form.category !== 'family' && <input placeholder="Rate ₱/class" type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />}
          {form.category === 'private' && (
            <input placeholder="Lessons in package" type="number" value={form.lessonsRemaining} onChange={(e) => setForm({ ...form, lessonsRemaining: e.target.value })} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
          )}
        </div>
        {form.category === 'family' && <p className="text-xs mt-2" style={{ color: MUTED }}>Family students share one lesson pool between siblings — set that up below in Family Pools, then link each child to it via their Profile.</p>}
        <div className="mt-3"><Btn variant="accent" onClick={submit}><Plus size={14} /> Add student</Btn></div>
      </div>

      <div className="mb-6">
        <button onClick={() => setShowPools(!showPools)} className="text-sm font-medium" style={{ color: ACCENT }}>{showPools ? '▾' : '▸'} Family Pools (shared lesson packages)</button>
        {showPools && <FamilyPoolsPanel familyPools={familyPools} students={students} addFamilyPool={addFamilyPool} updateFamilyPool={updateFamilyPool} />}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input value={rosterQuery} onChange={(e) => setRosterQuery(e.target.value)} placeholder="Search students by name…"
          className="w-full max-w-xs rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
        {rosterQuery && <span className="text-xs" style={{ color: MUTED }}>{visibleStudents.length} of {students.length}</span>}
      </div>

      <div className="space-y-2">
        {visibleStudents.map((s) => {
          const latest = (assessments[s.id] || [])[0];
          return <StudentRow key={s.id} student={s} level={latest?.level} effectiveLessons={getEffectiveLessons(s)} updateStudent={updateStudent} deleteStudent={deleteStudent} onProfile={() => setProfileFor(s.id)} />;
        })}
        {rosterQuery && visibleStudents.length === 0 && <p className="text-sm" style={{ color: MUTED }}>No students match "{rosterQuery}".</p>}
      </div>
      {profileFor && (
        <StudentProfileModal student={students.find((s) => s.id === profileFor)} latestAssessment={(assessments[profileFor] || [])[0]}
          familyPools={familyPools} updateStudent={updateStudent} onClose={() => setProfileFor(null)} />
      )}
    </div>
  );
}

function FamilyPoolsPanel({ familyPools, students, addFamilyPool, updateFamilyPool }) {
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [lessons, setLessons] = useState('');
  return (
    <div className="mt-2 rounded-xl p-4" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
      <div className="grid sm:grid-cols-4 gap-2 mb-3">
        <input placeholder="Pool name (e.g. David Family)" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md px-2 py-1.5 text-sm outline-none sm:col-span-2" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
        <input placeholder="Rate ₱/class" type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
        <input placeholder="Lessons purchased" type="number" value={lessons} onChange={(e) => setLessons(e.target.value)} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
      </div>
      <Btn variant="accent" onClick={() => { if (!name.trim()) return; addFamilyPool(name.trim(), rate, lessons); setName(''); setRate(''); setLessons(''); }}>Create pool</Btn>

      <div className="mt-4 space-y-2">
        {familyPools.map((p) => {
          const members = students.filter((s) => s.familyPoolId === p.id).map((s) => s.name).join(', ');
          return (
            <div key={p.id} className="rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap" style={{ backgroundColor: PAPER_LIGHT }}>
              <span className="font-medium">{p.name}</span>
              <span className="text-xs" style={{ color: MUTED }}>{members || 'no members linked yet'}</span>
              <div className="flex-1" />
              <span className="text-xs" style={{ color: MUTED }}>₱{p.rate}/class</span>
              <Btn onClick={() => updateFamilyPool(p.id, { lessonsRemaining: Math.round((p.lessonsRemaining - 0.5) * 100) / 100 })}>−</Btn>
              <span className="text-sm w-16 text-center font-mono">{p.lessonsRemaining} left</span>
              <Btn onClick={() => updateFamilyPool(p.id, { lessonsRemaining: Math.round((p.lessonsRemaining + 0.5) * 100) / 100 })}>+</Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudentRow({ student, level, effectiveLessons, updateStudent, deleteStudent, onProfile }) {
  const [editing, setEditing] = useState(false);
  const usesPool = student.category === 'family' && student.familyPoolId;
  return (
    <div className="rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: student.color }} />
      {editing ? (
        <input value={student.name} onChange={(e) => updateStudent(student.id, { name: e.target.value })} className="rounded-md px-2 py-1 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
      ) : <span className="font-medium">{student.name}</span>}
      <select value={student.category} onChange={(e) => updateStudent(student.id, { category: e.target.value, lessonsRemaining: e.target.value === 'company' ? null : (student.lessonsRemaining ?? 0) })} className="rounded-md px-2 py-1 text-xs outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }}>
        <option value="company">Company</option><option value="private">Private</option><option value="family">Family</option>
      </select>
      {!usesPool && (
        <div className="flex items-center gap-1 text-sm" style={{ color: MUTED }}>
          ₱<input type="number" value={student.rate ?? ''} onChange={(e) => updateStudent(student.id, { rate: e.target.value ? Number(e.target.value) : null })} className="w-16 rounded-md px-1.5 py-1 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />/class
        </div>
      )}
      {student.category !== 'company' && !usesPool && (
        <div className="flex items-center gap-1.5">
          <Btn onClick={() => updateStudent(student.id, { lessonsRemaining: Math.round(((student.lessonsRemaining || 0) - 0.5) * 100) / 100 })}>−</Btn>
          <span className="text-sm w-16 text-center font-mono">{student.lessonsRemaining ?? 0} left</span>
          <Btn onClick={() => updateStudent(student.id, { lessonsRemaining: Math.round(((student.lessonsRemaining || 0) + 0.5) * 100) / 100 })}>+</Btn>
        </div>
      )}
      {usesPool && <span className="text-xs" style={{ color: MUTED }}>Shares pool — {effectiveLessons} left</span>}
      {level && <Pill color={ACCENT}>{level}</Pill>}
      <div className="flex-1" />
      <Btn onClick={onProfile}>Profile</Btn>
      <Btn variant="ghost" onClick={() => setEditing(!editing)}><Pencil size={14} /></Btn>
      <Btn variant="danger" onClick={() => deleteStudent(student.id)}><Trash2 size={14} /></Btn>
    </div>
  );
}

function StudentProfileModal({ student, latestAssessment, familyPools, updateStudent, onClose }) {
  if (!student) return null;
  return (
    <Modal onClose={onClose}>
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: MUTED }}>Student Profile</div>
        <div className="font-semibold text-lg">{student.name}</div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-xs mb-1" style={{ color: MUTED }}>Age group (used for feedback tone)</div>
          <select value={student.ageGroup || 'adult'} onChange={(e) => updateStudent(student.id, { ageGroup: e.target.value })} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="kid">Kid</option><option value="teen">Teen</option><option value="adult">Adult</option>
          </select>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: MUTED }}>Login PIN (shown in plain text — only you as teacher see this)</div>
          <input value={student.pin || ''} onChange={(e) => updateStudent(student.id, { pin: e.target.value })} placeholder="Leave blank = no PIN required to log in as this student"
            className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
          <p className="text-xs mt-1" style={{ color: MUTED }}>If they forget it, just come back here and check — it's stored as plain text so you can always read it.</p>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: MUTED }}>Home time zone (what they see when they log in themselves)</div>
          <select value={student.homeTz || 'ph'} onChange={(e) => updateStudent(student.id, { homeTz: e.target.value })} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }}>
            {DISPLAY_TZ_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        {student.category === 'family' && (
          <div>
            <div className="text-xs mb-1" style={{ color: MUTED }}>Family pool</div>
            <select value={student.familyPoolId || ''} onChange={(e) => updateStudent(student.id, { familyPoolId: e.target.value || null })} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="">— not linked —</option>
              {familyPools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs mb-1" style={{ color: MUTED }}>Age</div>
            <input value={student.age || ''} onChange={(e) => updateStudent(student.id, { age: e.target.value })} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: MUTED }}>Nationality</div>
            <input value={student.nationality || ''} onChange={(e) => updateStudent(student.id, { nationality: e.target.value })} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: MUTED }}>Contact (WeChat / WhatsApp / phone)</div>
          <input value={student.contact || ''} onChange={(e) => updateStudent(student.id, { contact: e.target.value })} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: PAPER_LIGHT }}>
          <div className="text-xs mt-2" style={{ color: MUTED }}>Current level</div>
          <div>{latestAssessment ? latestAssessment.level : 'Not assessed yet'}</div>
        </div>
      </div>
      <div className="mt-4"><Btn onClick={onClose}>Close</Btn></div>
    </Modal>
  );
}

/* ---------------- Progress tab ---------------- */

function ProgressTab({ students, classLog, assessments, addAssessment, restrictedStudentId }) {
  const [studentId, setStudentId] = useState(restrictedStudentId || students[0]?.id || '');
  const [showAssessForm, setShowAssessForm] = useState(false);
  const [scores, setScores] = useState({ vocabulary: '', pronunciation: '', speaking: '', listening: '', grammar: '' });

  const activeId = restrictedStudentId || studentId;

  const entries = useMemo(() => {
    const all = [];
    Object.values(classLog).forEach((list) => list.forEach((e) => { if (e.feedback && e.studentId === activeId) all.push(e); }));
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, [classLog, activeId]);

  const history = assessments[activeId] || [];
  const current = history[0];
  const next = current ? nextLevelInfo(current.average) : null;

  const submitAssessment = () => {
    addAssessment(activeId, scores);
    setScores({ vocabulary: '', pronunciation: '', speaking: '', listening: '', grammar: '' });
    setShowAssessForm(false);
  };

  return (
    <div>
      {!restrictedStudentId && (
        <div className="mb-5 max-w-xs">
          <StudentPicker students={students} value={studentId} onChange={setStudentId} placeholder="Search student…" />
        </div>
      )}

      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: MUTED }}>CEFR placement (0–1000 scale assessment)</div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xl font-semibold" style={{ color: ACCENT }}>{current ? current.level : 'Not assessed yet'}</div>
            {current && <div className="text-xs" style={{ color: MUTED }}>Score {current.average}/1000 · assessed {templateDate(current.date)}</div>}
          </div>
          {!restrictedStudentId && <Btn variant="accent" onClick={() => setShowAssessForm(!showAssessForm)}>{showAssessForm ? 'Cancel' : 'New assessment'}</Btn>}
        </div>

        {current && (
          <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: PAPER_LIGHT }}>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: MUTED }}>What they're working on now</div>
            <p className="text-sm">{CEFR_LEVELS.find((l) => l.label === current.level)?.objectives}</p>
            {next && (
              <p className="text-xs mt-2" style={{ color: MUTED }}>
                Roughly {next.pointsNeeded} points from <strong style={{ color: TEXT }}>{next.next.label}</strong> — a rough estimate is ~{next.estLessons} more finished lessons (~{next.estHours} hours). This is a loose heuristic, not a guarantee; recalibrate with real assessments.
              </p>
            )}
          </div>
        )}

        {showAssessForm && !restrictedStudentId && (
          <div className="mt-4 grid sm:grid-cols-5 gap-2">
            {ASSESSMENT_SKILLS.map((sk) => (
              <div key={sk.key}>
                <div className="text-xs mb-1" style={{ color: MUTED }}>{sk.label}</div>
                <input type="number" min="0" max="1000" value={scores[sk.key]} onChange={(e) => setScores({ ...scores, [sk.key]: e.target.value })}
                  className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
            ))}
            <div className="sm:col-span-5"><Btn variant="accent" onClick={submitAssessment}>Save assessment</Btn></div>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-4 space-y-1">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: MUTED }}>History</div>
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 text-xs" style={{ color: MUTED }}>
                <span>{templateDate(h.date)}</span><span>{h.average}/1000</span><span>{h.level}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-sm font-medium mb-2">Saved feedback history</div>
      {entries.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ backgroundColor: PAPER, border: `1px dashed ${BORDER}`, color: MUTED }}>No saved feedback yet.</div>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <details key={e.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
              <summary className="cursor-pointer flex items-center gap-3 flex-wrap">
                <span className="font-medium">{templateDate(e.date)}</span>
                <span className="text-xs" style={{ color: MUTED }}>{e.feedback.todayLesson}</span>
              </summary>
              <pre className="whitespace-pre-wrap text-xs font-mono mt-3" style={{ color: MUTED }}>{e.feedback.finalText}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Billing tab ---------------- */

function BillingTab({ students, classLog, studentById, payments, assessments, familyPools, addPayment, deletePayment, settings, updateSettings, restoreAll, clearStudents, clearBookings, clearPayments, clearAssessments, clearFamilyPools, clearEverything }) {
  const today = toDateStr(new Date());
  const monthStart = `${today.slice(0, 7)}-01`;
  const [rangeStart, setRangeStart] = useState(monthStart);
  const [rangeEnd, setRangeEnd] = useState(today);
  const [earningsCategory, setEarningsCategory] = useState('all');
  const [receiptFor, setReceiptFor] = useState(null);
  const [payForm, setPayForm] = useState({ studentId: '', amount: '', lessonsPurchased: '', note: '', date: toDateStr(new Date()) });
  const [showSettings, setShowSettings] = useState(false);
  const [showRepSettings, setShowRepSettings] = useState(false);
  const [repPasscodeInput, setRepPasscodeInput] = useState('');
  const [showDanger, setShowDanger] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  const rangeEntries = useMemo(() => {
    const result = {};
    Object.entries(classLog).forEach(([date, list]) => {
      if (date < rangeStart || date > rangeEnd) return;
      list.forEach((e) => {
        if (e.status !== 'finished' && e.status !== 'absent') return;
        const s = studentById[e.studentId];
        if (earningsCategory !== 'all' && (!s || s.category !== earningsCategory)) return;
        result[e.studentId] = result[e.studentId] || [];
        result[e.studentId].push(e);
      });
    });
    Object.values(result).forEach((list) => list.sort((a, b) => a.date.localeCompare(b.date)));
    return result;
  }, [classLog, rangeStart, rangeEnd, earningsCategory, studentById]);

  const summaryRows = students.map((s) => {
    const list = rangeEntries[s.id] || [];
    const rate = s.rate || 0;
    const total = list.reduce((sum, e) => sum + (e.status === 'finished' ? rate : rate * 0.5), 0);
    return { student: s, count: list.length, total };
  }).filter((r) => r.count > 0);

  const grandTotal = summaryRows.reduce((sum, r) => sum + r.total, 0);
  const grandCount = summaryRows.reduce((sum, r) => sum + r.count, 0);

  const downloadBackup = () => {
    const backup = { exportedAt: new Date().toISOString(), students, classLog, payments, assessments, familyPools, settings };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esl-console-backup-${toDateStr(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // reset so picking the same file again still fires onChange
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let data;
      try { data = JSON.parse(ev.target.result); }
      catch (err) { alert("That file doesn't look like a valid backup file."); return; }
      if (window.confirm('This will REPLACE all current students, bookings, payments, assessments, and family pools with what\'s in this backup file. This cannot be undone. Continue?')) {
        restoreAll(data);
        alert('Backup restored.');
      }
    };
    reader.readAsText(file);
  };

  const submitPayment = () => {
    if (!payForm.studentId || !payForm.amount) return;
    addPayment(payForm.studentId, payForm.amount, payForm.lessonsPurchased, payForm.note, payForm.date);
    setPayForm({ studentId: '', amount: '', lessonsPurchased: '', note: '', date: toDateStr(new Date()) });
  };

  const onUploadLogo = async (file) => { if (!file) return; const url = await readFileAsDataUrl(file); updateSettings({ logoDataUrl: url }); };
  const onUploadSignature = async (file) => { if (!file) return; const url = await readFileAsDataUrl(file); updateSettings({ signatureDataUrl: url }); };

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => setShowSettings(!showSettings)} className="text-sm font-medium" style={{ color: ACCENT }}>{showSettings ? '▾' : '▸'} Business details (shown on receipts)</button>
        {showSettings && (
          <div className="mt-2 rounded-xl p-4 space-y-3" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
            <div>
              <div className="text-xs mb-1" style={{ color: MUTED }}>Business / your name</div>
              <input value={settings?.businessName || ''} onChange={(e) => updateSettings({ businessName: e.target.value })} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs mb-1" style={{ color: MUTED }}>Logo (small image, e.g. under 500KB)</div>
                <input type="file" accept="image/*" onChange={(e) => onUploadLogo(e.target.files[0])} className="text-xs" style={{ color: MUTED }} />
                {settings?.logoDataUrl && <img src={settings.logoDataUrl} alt="logo" className="h-12 mt-2 rounded" />}
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: MUTED }}>Signature image (optional)</div>
                <input type="file" accept="image/*" onChange={(e) => onUploadSignature(e.target.files[0])} className="text-xs" style={{ color: MUTED }} />
                {settings?.signatureDataUrl && <img src={settings.signatureDataUrl} alt="signature" className="h-10 mt-2 rounded" />}
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: MUTED }}>Or typed signature (used if no image uploaded)</div>
              <input value={settings?.signatureText || ''} onChange={(e) => updateSettings({ signatureText: e.target.value })} className="w-full rounded-md px-2 py-1.5 text-sm outline-none italic" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT, fontFamily: 'cursive' }} />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: MUTED }}>Rules & policies (shown at the bottom of every receipt)</div>
              <textarea value={settings?.policiesText || ''} onChange={(e) => updateSettings({ policiesText: e.target.value })} rows={3} className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <button onClick={() => setShowRepSettings(!showRepSettings)} className="text-sm font-medium" style={{ color: ACCENT }}>{showRepSettings ? '▾' : '▸'} Company representative access</button>
        {showRepSettings && (
          <div className="mt-2 rounded-xl p-4 space-y-2" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
            <p className="text-xs" style={{ color: MUTED }}>
              {settings?.repPasscode
                ? 'Representative access is set up. Anyone with this passcode can log in as "Company Representative" and book Company-category students — they can\'t see Private/Family bookings or reach Students, Progress, Billing, or Reports.'
                : "Not set up yet — nobody can log in as a representative until you set a passcode here."}
            </p>
            <input type="password" value={repPasscodeInput} onChange={(e) => setRepPasscodeInput(e.target.value)} placeholder="Representative passcode"
              className="w-full rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
            <div className="flex gap-2 flex-wrap">
              <Btn variant="accent" disabled={!repPasscodeInput.trim()} onClick={() => { updateSettings({ repPasscode: repPasscodeInput.trim() }); setRepPasscodeInput(''); }}>
                {settings?.repPasscode ? 'Update passcode' : 'Set passcode'}
              </Btn>
              {settings?.repPasscode && (
                <Btn variant="danger" onClick={() => { if (window.confirm('Remove representative access? Nobody will be able to log in with the old passcode anymore.')) updateSettings({ repPasscode: '' }); }}>
                  Remove representative access
                </Btn>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
        <div className="text-sm font-medium mb-3">Record a payment</div>
        <div className="grid sm:grid-cols-6 gap-2">
          <div className="sm:col-span-2">
            <StudentPicker students={students} value={payForm.studentId} onChange={(id) => setPayForm({ ...payForm, studentId: id })} placeholder="Search student…" />
          </div>
          <input placeholder="Amount ₱" type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
          <input placeholder="Lessons purchased" type="number" value={payForm.lessonsPurchased} onChange={(e) => setPayForm({ ...payForm, lessonsPurchased: e.target.value })} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
          <input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
          <input placeholder="Note (optional)" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: INK, border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <p className="text-xs mt-2" style={{ color: MUTED }}>Date defaults to today — change it if you're recording a payment you forgot to log earlier. For a Family student linked to a shared pool, the purchased lessons go into that pool, not just one child.</p>
        <div className="mt-3"><Btn variant="accent" onClick={submitPayment}>Record payment</Btn></div>
      </div>

      <div className="mb-6">
        <div className="text-sm font-medium mb-2">Payment history</div>
        <div className="space-y-2">
          {students.filter((s) => (payments[s.id] || []).length > 0).map((s) => (
            <div key={s.id}>
              <div className="text-xs mb-1" style={{ color: MUTED }}>{s.name}</div>
              {(payments[s.id] || []).map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1 flex-wrap" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
                  <span className="text-sm">{templateDate(p.date)}</span>
                  <span className="font-mono" style={{ color: ACCENT }}>₱{p.amount.toFixed(2)}</span>
                  <span className="text-xs" style={{ color: MUTED }}>{p.lessonsPurchased} lesson(s){p.note ? ` · ${p.note}` : ''}</span>
                  <div className="flex-1" />
                  <Btn onClick={() => setReceiptFor({ studentId: s.id, paymentId: p.id })}><FileText size={14} /> Receipt</Btn>
                  <Btn variant="danger" onClick={() => { if (window.confirm(`Delete this ₱${p.amount.toFixed(2)} payment for ${s.name}? This also removes the ${p.lessonsPurchased} lesson(s) it added. This cannot be undone.`)) deletePayment(s.id, p.id); }}><Trash2 size={14} /></Btn>
                </div>
              ))}
            </div>
          ))}
          {students.every((s) => (payments[s.id] || []).length === 0) && <p className="text-sm" style={{ color: MUTED }}>No payments recorded yet.</p>}
        </div>
      </div>

      <div className="mb-2 text-sm font-medium">Earnings by date range (from Finished/Absent lessons)</div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>From
          <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}`, color: TEXT }} />
        </label>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>To
          <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}`, color: TEXT }} />
        </label>
        <select value={earningsCategory} onChange={(e) => setEarningsCategory(e.target.value)} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label} only</option>)}
        </select>
      </div>

      <div className="rounded-xl p-4 mb-3 flex flex-wrap items-center gap-6" style={{ backgroundColor: PAPER_LIGHT, border: `1px solid ${ACCENT}55` }}>
        <div>
          <div className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>Total earned</div>
          <div className="text-2xl font-semibold" style={{ color: ACCENT }}>₱{grandTotal.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>Classes counted</div>
          <div className="text-2xl font-semibold">{grandCount}</div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        {summaryRows.map((r) => (
          <div key={r.student.id} className="flex items-center gap-3 px-4 py-3 flex-wrap" style={{ backgroundColor: PAPER, borderTop: `1px solid ${BORDER}` }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.student.color }} />
            <span className="font-medium flex-1">{r.student.name}</span>
            <span className="text-sm" style={{ color: MUTED }}>{r.count} lesson(s)</span>
            <span className="font-mono" style={{ color: ACCENT }}>₱{r.total.toFixed(2)}</span>
          </div>
        ))}
        {summaryRows.length === 0 && <div className="px-4 py-10 text-center text-sm" style={{ color: MUTED }}>No finished or charged lessons in this range yet.</div>}
      </div>

      <div className="mt-6">
        <button onClick={() => setShowBackup(!showBackup)} className="text-sm font-medium" style={{ color: ACCENT }}>{showBackup ? '▾' : '▸'} Backup & Restore</button>
        {showBackup && (
          <div className="mt-2 rounded-xl p-4 space-y-4" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
            <div>
              <p className="text-xs mb-2" style={{ color: MUTED }}>Download everything — students, bookings, payments, assessments, family pools, and settings — as one file you can keep somewhere safe.</p>
              <Btn variant="accent" onClick={downloadBackup}><Download size={14} /> Download backup</Btn>
            </div>
            <div className="pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              <p className="text-xs mb-2" style={{ color: MUTED }}>Restore from a backup file. This replaces everything currently saved for everyone — use with care.</p>
              <input type="file" accept="application/json" onChange={handleRestoreFile} className="text-xs" style={{ color: TEXT }} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button onClick={() => setShowDanger(!showDanger)} className="text-sm font-medium" style={{ color: RED }}>{showDanger ? '▾' : '▸'} Danger Zone (clear data)</button>
        {showDanger && (
          <div className="mt-2 rounded-xl p-4 space-y-3" style={{ backgroundColor: PAPER, border: `1px solid ${RED}` }}>
            <p className="text-xs" style={{ color: MUTED }}>These can't be undone. Clearing just students (while keeping bookings/payments) can leave old entries pointing at a student that no longer exists — if you're starting fresh, "Clear everything" avoids that.</p>
            <div className="flex flex-wrap gap-2">
              <Btn variant="danger" onClick={() => { if (window.confirm('Delete every booking/schedule entry? This cannot be undone.')) clearBookings(); }}>Clear all bookings</Btn>
              <Btn variant="danger" onClick={() => { if (window.confirm('Delete every payment record? This cannot be undone.')) clearPayments(); }}>Clear all payments</Btn>
              <Btn variant="danger" onClick={() => { if (window.confirm('Delete every assessment record? This cannot be undone.')) clearAssessments(); }}>Clear all assessments</Btn>
              <Btn variant="danger" onClick={() => { if (window.confirm('Delete every family pool? This cannot be undone.')) clearFamilyPools(); }}>Clear family pools</Btn>
              <Btn variant="danger" onClick={() => { if (window.confirm('Delete every student profile? This cannot be undone, and bookings/payments already tied to them will look broken until you also clear those.')) clearStudents(); }}>Clear all students</Btn>
            </div>
            <div className="pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
              <Btn variant="danger" onClick={() => {
                const typed = window.prompt('This deletes EVERYTHING — students, bookings, payments, assessments, family pools — for everyone using this site. Type DELETE to confirm.');
                if (typed === 'DELETE') clearEverything();
              }}>⚠ Clear everything and start fresh</Btn>
            </div>
          </div>
        )}
      </div>

      {receiptFor && (
        <ReceiptModal
          student={studentById[receiptFor.studentId]}
          payment={(payments[receiptFor.studentId] || []).find((p) => p.id === receiptFor.paymentId)}
          settings={settings}
          onClose={() => setReceiptFor(null)}
        />
      )}
    </div>
  );
}

function ReceiptModal({ student, payment, settings, onClose }) {
  const [status, setStatus] = useState('idle'); // idle | working | error

  const downloadImage = async () => {
    setStatus('working');
    try {
      await generateReceiptImage(student, payment, settings);
      setStatus('idle');
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <Modal onClose={onClose} wide>
      <div id="receipt-print-root" className="p-4 rounded-lg" style={{ backgroundColor: '#ffffff', color: '#111111' }}>
        <div className="flex items-center gap-3 mb-4">
          {settings?.logoDataUrl && <img src={settings.logoDataUrl} alt="logo" style={{ height: '48px' }} />}
          <div>
            <h2 className="text-lg font-semibold">{settings?.businessName || 'Lesson Receipt'}</h2>
            <p className="text-xs" style={{ color: '#555' }}>Official lesson receipt</p>
          </div>
        </div>
        <table className="w-full text-sm mb-4">
          <tbody>
            <tr><td className="py-1" style={{ color: '#555' }}>Received from</td><td className="py-1 text-right">{student.name}</td></tr>
            <tr><td className="py-1" style={{ color: '#555' }}>Date</td><td className="py-1 text-right">{templateDate(payment.date)}</td></tr>
            <tr><td className="py-1" style={{ color: '#555' }}>Amount paid</td><td className="py-1 text-right">₱{payment.amount.toFixed(2)}</td></tr>
            <tr><td className="py-1" style={{ color: '#555' }}>Lessons purchased</td><td className="py-1 text-right">{payment.lessonsPurchased}</td></tr>
            {payment.note && <tr><td className="py-1" style={{ color: '#555' }}>Note</td><td className="py-1 text-right">{payment.note}</td></tr>}
          </tbody>
        </table>
        {settings?.policiesText && (
          <div className="text-xs mb-4 p-2 rounded" style={{ backgroundColor: '#f5f5f5', color: '#444' }}>
            <strong>Rules & policies:</strong> {settings.policiesText}
          </div>
        )}
        <div className="mt-6 flex items-center justify-end gap-2">
          <span className="text-xs" style={{ color: '#555' }}>Signature:</span>
          {settings?.signatureDataUrl ? <img src={settings.signatureDataUrl} alt="signature" style={{ height: '32px' }} /> : <span style={{ fontFamily: 'cursive', fontSize: '18px' }}>{settings?.signatureText || ''}</span>}
        </div>
      </div>
      {status === 'error' && (
        <p className="text-xs mt-3" style={{ color: RED }}>Something went wrong generating the image — try again in a moment.</p>
      )}
      <div className="flex gap-2 mt-4">
        <Btn variant="accent" onClick={downloadImage} disabled={status === 'working'}><Download size={14} /> {status === 'working' ? 'Preparing image…' : 'Download receipt (PNG)'}</Btn>
        <Btn onClick={onClose}>Close</Btn>
      </div>
    </Modal>
  );
}

/* ---------------- Reports tab ---------------- */

function ReportsTab({ classLog, studentById }) {
  const [date, setDate] = useState(toDateStr(new Date()));
  const entries = (classLog[date] || []).filter((e) => e.feedback);

  const download = () => {
    let content = `Session Feedback — ${prettyDate(date)}\n`;
    content += '='.repeat(50) + '\n\n';
    entries.forEach((e) => {
      const student = studentById[e.studentId];
      content += (e.feedback.finalText || buildFinalText(e, student, e.feedback)) + '\n\n' + '-'.repeat(50) + '\n\n';
    });
    downloadTextFile(`feedback-${date}.txt`, content);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}`, color: TEXT }} />
        <Btn variant="accent" onClick={download} disabled={entries.length === 0}><Download size={14} /> Download {entries.length} feedback entr{entries.length === 1 ? 'y' : 'ies'}</Btn>
      </div>
      {entries.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ backgroundColor: PAPER, border: `1px dashed ${BORDER}`, color: MUTED }}>No saved feedback for this date.</div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded-lg px-4 py-3" style={{ backgroundColor: PAPER, border: `1px solid ${BORDER}` }}>
              <span className="font-medium">{studentById[e.studentId]?.name}</span>
              <span className="text-xs ml-2" style={{ color: MUTED }}>{e.feedback.todayLesson}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
