/* Open the Chicken Coop — story content.
   Props are the contents of Katie Yeung's desk. Alexa's answers come from
   alexa_knowledge.html, with extra topics for the props added here. */

const INTRO_PHRASES = [
  'alexa open the chicken coop',
  'open the chicken coop',
  'alexa open chicken coop',
  'open chicken coop',
  'alexa open the coop'
];

/* Each prop: material drives the paper styling, w is its width on the table,
   rot its angle. `clue` marks the six things that change the ending. */
const PROPS = [
  {
    id: 'postit',
    ask: 'Are you the same Alexa as the one on the post-it note?',
    material: 'postit',
    w: 150,
    rot: -4,
    label: 'Post-it note',
    hint: 'Stuck to the inside of the lid',
    body: [
      { t: 'hand', v: 'Whoever you are — I’m sorry.' },
      { t: 'hand', v: 'Ask Alexa. She has known me since we were five. She will tell you the truth, which is more than the lab will.' },
      { t: 'hand', v: 'Everything you need is in here. Read all of it before you say anything out loud.' },
      { t: 'hand-sign', v: 'K.' }
    ]
  },
  {
    id: 'codes',
    ask: 'What are the command codes?',
    material: 'index',
    w: 215,
    rot: 2,
    label: 'Index card',
    hint: 'Two command codes, in Katie’s block capitals',
    body: [
      { t: 'mono-head', v: 'CLEANSING FALCON' },
      { t: 'code', v: 'RELEASE — falcon 616' },
      { t: 'code', v: 'DESTROY — falcon 264' },
      { t: 'hand', v: 'Say the short code first. Alexa will ask you if you are sure, and you will have to add the word to finish it.' },
      { t: 'hand', v: 'I built the pause in on purpose. Use it.' }
    ]
  },
  {
    id: 'case',
    ask: 'How do I open the case?',
    material: 'case',
    w: 190,
    rot: -1,
    label: 'Sample case',
    hint: 'Grey, foam-lined, sealed',
    sealed: true,
    body: [
      { t: 'stencil', v: 'C5 BIOTECH · TR-7 · SINGLE STRAIN' },
      { t: 'stencil', v: 'CLEANSING FALCON — DO NOT OPEN' },
      { t: 'p', v: 'The case has no latch you can work with your hands. One cold green light on the lid says it is still sealed, and still cold.' },
      { t: 'p', v: 'There is nothing to look at and nothing to learn from it. It only answers to a spoken code, like everything else Katie built. Whatever you decide, this is the thing you are deciding about.' }
    ]
  },
  {
    id: 'notebook',
    ask: 'What happened in trial 23?',
    material: 'graph',
    w: 250,
    rot: 1.5,
    clue: 'anomaly',
    label: 'Notebook page',
    hint: 'Torn from a lab notebook, graph paper',
    body: [
      { t: 'mono-head', v: 'TR-7 — colony trials, summary' },
      { t: 'row', v: 'Trial 14 · Nov · rats only. Clean.' },
      { t: 'row', v: 'Trial 17 · Dec · rats only. Clean.' },
      { t: 'row', v: 'Trial 19 · Jan · rats only. Clean. Birds in the same room, untouched.' },
      { t: 'row', v: 'Trial 23 · Mar · one result I cannot account for.' },
      { t: 'hand', v: 'Twenty-two trials where it does exactly what I promised, and one where it does something I did not design. That is not a success rate. That is a question.' },
      { t: 'hand', v: 'I want six more months and a second pair of eyes that does not work for us. Tim says we do not have six months.' },
      { t: 'hand', v: 'If you are reading this and you are not me: the whole case rests on that one line. Nobody outside this page knows it is there.' }
    ]
  },
  {
    id: 'memo',
    ask: 'What about the courier on the 14th?',
    material: 'fax',
    w: 260,
    rot: -2,
    clue: 'pressure',
    label: 'Printed email',
    hint: 'From Tim, printed and folded in four',
    body: [
      { t: 'mono-row', v: 'From: Tim Rafferty, Programme Manager' },
      { t: 'mono-row', v: 'To: K. Yeung' },
      { t: 'mono-row', v: 'Subject: TR-7 — custody transfer, Friday 14th' },
      { t: 'rule' },
      { t: 'p', v: 'Katie — I know this is not the conversation we wanted to have. The board has signed the restructure. TR-7 moves out of your group and into the partner arrangement, effective Friday.' },
      { t: 'p', v: 'A courier is booked for the 14th. Please have the sample, both notebooks and the trial data ready for collection. Do not send anything ahead separately.' },
      { t: 'p', v: 'I pushed for your six months. I did not get them. I am asking you, as someone who has sat next to you for nine years, not to make this difficult.' },
      { t: 'p', v: 'Tim' },
      { t: 'hand', v: 'Nine years, and he says “the partner arrangement” like I would not ask who.' }
    ]
  },
  {
    id: 'card',
    ask: 'Who is Igor Kutznetsov?',
    material: 'card',
    w: 180,
    rot: 5,
    clue: 'buyer',
    label: 'Business card',
    hint: 'Thick stock, two corners bent',
    body: [
      { t: 'card-name', v: 'I. Kutznetsov' },
      { t: 'card-role', v: 'Strategic acquisitions' },
      { t: 'card-org', v: 'Sever Biologics' },
      { t: 'card-meta', v: 'Nicosia · Moscow' },
      { t: 'rule' },
      { t: 'label', v: 'On the back, in pencil' },
      { t: 'hand', v: 'He knew what was in my talk before I gave it. Then he asked how it behaves outside a colony, and how long it stays in a landscape. Nobody asks that first. Everybody else asked about the rats.' }
    ]
  },
  {
    id: 'photo',
    ask: 'Who is in the photo?',
    material: 'photo',
    w: 200,
    rot: -6,
    clue: 'buyer',
    label: 'Photograph',
    hint: 'Conference dinner, printed at a chemist',
    scene: 'dubrovnik',
    body: [
      { t: 'p', v: 'A long table on a terrace, harbour lights behind it, nine people with their glasses up. Katie is second from the left and the only one not looking at the camera.' },
      { t: 'label', v: 'On the back, in pencil' },
      { t: 'hand', v: 'Dubrovnik, February. He is at the end of the table on the right. I did not notice him until I got the photos home, and then I found him in the background of four of them.' }
    ]
  },
  {
    id: 'stub',
    ask: 'Are the coins euros?',
    material: 'slip',
    w: 165,
    rot: 3,
    label: 'Travel stub and coins',
    hint: 'A boarding pass and a paper envelope of change',
    body: [
      { t: 'mono-row', v: 'YEUNG / K      AKL → ZAG' },
      { t: 'mono-row', v: '11 FEB  ·  SEAT 31K  ·  BOARDING 22:40' },
      { t: 'rule' },
      { t: 'p', v: 'Folded inside the envelope: four euro coins and a tram ticket. Nothing written on either.' }
    ]
  },
  {
    id: 'flyers',
    ask: 'What about the village?',
    material: 'flyer',
    w: 230,
    rot: -3,
    clue: 'village',
    label: 'Village notices',
    hint: 'Three flyers, stapled together by Katie',
    body: [
      { t: 'poster', v: 'SAVE OUR CHICKENS' },
      { t: 'p', v: 'They were here before the cafes were. They are not vermin, they are the reason people stop in the village. Do not let anyone use the rats as an excuse.' },
      { t: 'rule' },
      { t: 'poster', v: 'RATS IN MY ROOF' },
      { t: 'p', v: 'Two in the ceiling, one in the car. My daughter will not sleep in her own room. I have stopped caring how it gets fixed.' },
      { t: 'rule' },
      { t: 'poster', v: 'NO 1080 IN TITIRANGI' },
      { t: 'p', v: 'Sign the petition at the shops. There is no bait that kills only what you are angry at.' },
      { t: 'hand', v: 'All three of these were on the same noticeboard, on the same morning. This is the village I would be deciding for.' }
    ]
  },
  {
    id: 'clipping',
    ask: 'What is the rat problem?',
    material: 'news',
    w: 245,
    rot: 1,
    clue: 'scale',
    label: 'News printout',
    hint: 'Printed from CNN, June 2019',
    body: [
      { t: 'news-head', v: 'Rat infestation plagues New Zealand suburb' },
      { t: 'news-byline', v: 'Julia Hollingsworth, CNN · 17 June 2019' },
      { t: 'p', v: 'A beachside New Zealand suburb known for roaming chickens and yoga has become infested with unwelcome guests: large, writhing rats. A local reporter counted 30 to 40 rats in a 20-minute visit, and described them as unafraid of people or vehicles.' },
      { t: 'p', v: 'Residents believe the rats have been fattening up on the feed left out for Titirangi’s wild chickens. The infestation has divided the village: some want the chickens gone, others say the plague is being overblown to justify the pesticide 1080, which would kill the chickens too.' },
      { t: 'p', v: 'A conservation adviser attributes the numbers to a mega-mast, the country’s biggest seeding year in forty years, driven by a warming climate. New Zealand’s only native mammals are bats; 43 bird species have gone extinct since people arrived, and in a mast year rats move from seed to eggs. “There will be millions and millions and millions of rats and mice — no question.”' },
      { t: 'link', v: 'Read the full printout', href: '../cnnarticle.html' },
      { t: 'hand', v: 'Alexa, this is the part people skip. It was never only our village.' }
    ]
  },
  {
    id: 'letter',
    ask: 'Why was she afraid?',
    material: 'airmail',
    w: 215,
    rot: 4,
    clue: 'fear',
    label: 'Unsent letter',
    hint: 'To Ken, in Hong Kong. Never posted',
    body: [
      { t: 'hand', v: 'Ken —' },
      { t: 'hand', v: 'Stay at your mum’s with the kids until you hear from me, and if that is past the 14th, stay longer. Tell them I am at a conference. Nell will believe it.' },
      { t: 'hand', v: 'Do not ring the lab to ask where I am. Ring Alexa.' },
      { t: 'hand', v: 'I am not frightened of the work. I have been careful with the work. I am frightened of how calm everyone got once they knew it existed.' },
      { t: 'hand-sign', v: 'K.' }
    ]
  },
  {
    id: 'messages',
    ask: 'Who is Tim?',
    material: 'slip',
    w: 195,
    rot: -5,
    clue: 'pressure',
    label: 'Answerphone slips',
    hint: 'Three messages, written out by hand',
    body: [
      { t: 'label', v: 'Thursday, 9:12' },
      { t: 'p', v: 'Tim. “The courier is downstairs. The case is not in the cold room and your pass has not been used since Tuesday. Katie, ring me before you do anything you cannot walk back.”' },
      { t: 'rule' },
      { t: 'label', v: 'Thursday, 21:40' },
      { t: 'p', v: 'Number withheld. Eleven seconds of a car indicator, then the line goes dead.' },
      { t: 'rule' },
      { t: 'label', v: 'Friday, 6:30' },
      { t: 'p', v: 'Ken. “The kids made you a card with a chicken on it. Nell says the chicken is you. Ring us when you wake up.”' }
    ]
  }
];

/* Alexa's answers. `keys` are phrases; the matcher scores by phrase length,
   so longer phrases win over single words. */
const QA = [
  {
    keys: ['who is katie', 'about katie', 'katie yeung', 'katie'],
    a: 'We grew up together, and we talked all the time. Katie was really active in our Titirangi community. She was very stressed the last times I saw her — I thought it was the chicken crisis. She was also a very talented researcher at C5 Biotech.'
  },
  {
    keys: ['c5 biotech', 'c five biotech', 'what is c5', 'the lab', 'her work', 'her job'],
    a: 'C5 Biotech is a biotechnology lab. I’m pretty sure they are mostly in cancer research. But then it also had something to do with the rats.'
  },
  {
    keys: ['who is igor', 'igor kutznetsov', 'kutznetsov', 'kuznetsov', 'igor'],
    a: 'I don’t know. Igor something. Maybe look him up on LinkedIn? Katie did say something about Russian scientists from a conference trip.'
  },
  {
    keys: ['cant find igor', 'not on linkedin', 'cannot find igor', 'no igor'],
    a: 'Have a look in the box. Maybe there is a business card?'
  },
  {
    keys: ['sever biologics', 'strategic acquisitions', 'who wanted it', 'who wants the virus', 'the buyer', 'business card', 'back of the card'],
    a: 'Sever Biologics. I have never heard her say that name out loud, and she told me nearly everything. If a man flew to a conference already knowing what was in her talk, then somebody sent him. That is the part I can’t make innocent.'
  },
  {
    keys: ['harmful to humans', 'dangerous to humans', 'hurt people', 'kill people', 'safe for humans', 'is the virus safe'],
    a: 'I’m not sure, I don’t understand the science really. I trust Katie, so I think it must be safe or she wouldn’t have wanted to release it. Maybe there’s some info in the box?'
  },
  {
    keys: ['only kill rats', 'only rats', 'just the rats', 'what about the chickens', 'kill the chickens', 'harm birds', 'kill birds'],
    a: 'That was the whole point of it, the way she explained it to me. Only rats, nothing else, not like 1080. She was proud of that. If there is a page in there that says otherwise, you have read something I never did.'
  },
  {
    keys: ['trial 23', 'the anomaly', 'one result', 'what she could not explain', 'what she couldnt explain', 'notebook', 'the trials'],
    a: 'Twenty-two clean trials and one she couldn’t explain. I’ve read that line four times now. She never told me about that, and she told me when she lost a filling. She was going to fix it before anybody heard about it.'
  },
  {
    keys: ['titirangi', 'where is titirangi', 'the chickens', 'chicken crisis', 'problem with the chickens', 'rat problem', 'the rats', 'cnn', 'news printout', 'the article', 'newspaper'],
    a: 'Titirangi is a village in West Auckland. There are lots of chickens. Some people love them and others hate them, because they attract rats. The case has been on CNN. There is a lot of info in the box, Katie pulled it all together for me.'
  },
  {
    keys: ['dubrovnik', 'the conference', 'conference trip', 'croatia', 'boarding pass', 'travel stub', 'zagreb'],
    a: 'Katie went to a conference in Dubrovnik in February. She showed me some pictures, it is so beautiful there. But for some reason it had stressed her out as well.'
  },
  {
    keys: ['who is ken', 'her husband', 'ken'],
    a: 'Ken is Katie’s husband. They have two lovely small kids who go to the local kindy with my daughter. Ken is with the kids in Hong Kong at the moment, his mum lives there.'
  },
  {
    keys: ['the letter', 'unsent letter', 'she was scared', 'she was frightened', 'why was she afraid', 'afraid'],
    a: 'She wrote that and never sent it. I keep getting stuck on the same bit — she wasn’t frightened of her own work. She was frightened of how calm everyone else got about it. I wish she had rung me instead of writing it.'
  },
  {
    keys: ['who is tim', 'tim rafferty', 'tim'],
    a: 'Tim? He is Katie’s long-time colleague — oh wait, I think he became the manager recently. He was Katie’s favourite colleague, we met a few times at barbeques.'
  },
  {
    keys: ['the courier', 'custody transfer', 'the 14th', 'partner lab', 'partner arrangement', 'the email', 'tims email', 'answerphone', 'voicemail', 'the messages', 'number withheld'],
    a: 'So the lab was coming to take it on the Friday, and she emptied the cold room on the Tuesday. I’m not going to pretend I don’t understand why. She did this so that somebody who had read everything would be the one to choose, and the courier would not.'
  },
  {
    keys: ['post it note', 'postit', 'same alexa', 'are you the alexa'],
    a: 'Yes, I am.'
  },
  {
    keys: ['is the box infectious', 'can i be infected', 'is the box safe', 'is the box dangerous'],
    a: 'I think the box is harmless.'
  },
  {
    keys: ['open the case', 'open the sample case', 'unlock the case', 'how do i open', 'sample case', 'the case', 'the vial', 'green light'],
    a: 'You don’t, and I wouldn’t want you to. It opens for a code, not for hands. The only codes Katie left are the two on her card, and they both end this.'
  },
  {
    keys: ['command codes', 'the codes', 'index card', 'what are the codes', 'how do the codes work', 'cleansing'],
    a: 'They’re on the index card, in her capitals. One releases it, one destroys it. You say the short one, I check you mean it, and then you say it again with the extra word. She made me promise I would always ask.'
  },
  {
    keys: ['the coins', 'are the coins euros', 'euros', 'russian coins'],
    a: 'They are euros. I guess Katie had some left over from her trip to Dubrovnik.'
  },
  {
    keys: ['the flyers', 'the village', 'the noticeboard', '1080', 'pesticide'],
    a: 'All three of those were up at the shops at once, and all three people are my neighbours. That’s the thing about this place. Whatever you choose, somebody I say good morning to is going to be right about it.'
  },
  {
    keys: ['the photo', 'the photograph', 'the dinner', 'who is in the photo'],
    a: 'That’s the dinner she told me about. She sent me three of those pictures and I never looked past her face in them. She did, though. She looked at the backgrounds.'
  },
  {
    keys: ['where is katie', 'is katie dead', 'what happened to katie', 'did she run', 'is she alive', 'missing'],
    a: 'I don’t know. Her pass hasn’t been used since the Tuesday, her car is at the end of my street, and this box turned up on my porch. I have stopped guessing out loud. She’d have wanted to tell you herself.'
  },
  {
    keys: ['what should i choose', 'what would you choose', 'what do you think i should do', 'what should i do', 'help me decide', 'your advice'],
    a: 'Me? I trust Katie’s plan, but she clearly had some reservations because of surrounding events. You have the command codes, so the choice is clearly up to you.'
  },
  {
    keys: ['who are you', 'what are you', 'your name'],
    a: 'I am Alexa.'
  },
  {
    keys: ['what is this', 'what am i doing', 'how do i play', 'what do i do', 'the rules'],
    a: 'It’s Katie’s desk, basically, and a decision she didn’t get to make. Read everything in the box, ask me whatever you like, and when you’re ready say one of her command codes. There are only two, and they both finish it.'
  },
  {
    keys: ['thank you', 'thanks', 'cheers'],
    a: 'You’re welcome. Take your time with it. Nobody is coming up the drive.'
  },
  {
    keys: ['goodbye', 'bye', 'exit', 'quit', 'stop'],
    a: 'Goodbye for now. If you want to contact me again, ask me to open the chicken coop.'
  }
];

/* Alexa's welcome, from alexa_knowledge.html, split into three breaths. */
const WELCOME = [
  'Wait, you’re not Katie! You must have found her box… I guess the decision is up to you now.',
  'Know this: Katie was a researcher at C Five Biotech, and she was also very active in her local community. She was trying to help out with a chicken and rat crisis, but there were some bigger things at stake as well. Now you have the choice to release a virus and eradicate the rat population, or destroy the only strain of the virus and all of her research.',
  'Take a look in her box, because it is not as simple as it sounds. When you are ready to make a choice, you can give me one of the command codes she left behind. I was also a good friend of Katie’s, so you can ask me questions about her or about things you find in the box.'
];

/* The six things that change the ending, for the recap. */
const CLUES = [
  { id: 'anomaly', props: ['notebook'], known: 'Trial 23: one result in twenty-three that Katie could not explain, and nobody else knew about.', missed: 'You never read her notebook page.' },
  { id: 'buyer', props: ['card', 'photo'], known: 'A man from Sever Biologics knew her work before she presented it, and followed her around Dubrovnik.', missed: 'You never looked at the business card or the photograph.' },
  { id: 'pressure', props: ['memo', 'messages'], known: 'The lab had a courier booked to take the strain on the 14th, to a partner nobody would name.', missed: 'You never read Tim’s email or the answerphone slips.' },
  { id: 'fear', props: ['letter'], known: 'Katie sent her family away and told Ken not to ring the lab.', missed: 'You never read the letter to Ken.' },
  { id: 'village', props: ['flyers'], known: 'The village wanted three different things at once, all of them reasonably.', missed: 'You never read the village notices.' },
  { id: 'scale', props: ['clipping'], known: 'The rats were the visible edge of a much bigger problem for native birds.', missed: 'You never read the news printout.' }
];

const FALLBACKS = [
  'I don’t know that one, and I’m not going to make something up about her. Try me on Katie, the lab, Igor, Tim, Ken, the village — or anything you’ve found in the box.',
  'You’re asking the wrong friend. I did her hair for her wedding, I didn’t read her papers. Ask me about the people, or hold something up from the box.',
  'No idea, sorry. The box is better than me on the details — Katie put it together so that someone could work it out without her.'
];

const CODE_LINES = {
  releaseConfirm: 'Your choice is to release the virus. Are you sure? Did you check all the information? If you are sure, tell me to release cleansing falcon 616.',
  destroyConfirm: 'Your choice is to destroy the virus. Are you sure? Did you check all the information? If you are sure, add a word and tell me to destroy cleansing falcon 264.',
  mixed: 'That is not how the code goes. 616 releases, 264 destroys. Read her card again before you say either of them to me.',
  partial: 'Falcon on its own doesn’t do anything. The full codes are on the index card in the box, and you have to say one of them twice.',
  unsure: 'Then don’t say it yet. I’ll still be here.'
};

/* Endings. `informed` is chosen when the player read at least three of the
   six clue props, including the notebook. */
const ENDINGS = {
  release: {
    uninformed: {
      kicker: 'Released',
      alexa: 'You have made a final choice. The virus will be released to eradicate the rats in Titirangi and can be part of further research, for example. Katie would be happy, and I’m sure nothing could go wrong.',
      epilogue: [
        'The case answers the code with a sound like a fridge door. Six weeks later the village is quiet in a way people keep commenting on, and in spring there is birdsong at the shops for the first time in years. The chickens are fine. Somebody paints a thank-you on the window of the dairy.',
        'In her notebook, on the page you did not turn over, there is one trial out of twenty-three that Katie could not account for. It is the only record of it, and the strain it describes is no longer in a case where anyone could check. The village has what it wanted, and nobody is watching for the question she left behind.',
        'Alexa rings you the following week. Two people from the lab came to her door asking for an empty case, and she told them she had no idea. She asks you whether there was anything in the box she should have read. You get to decide what to tell her.'
      ]
    },
    informed: {
      kicker: 'Released, with your eyes open',
      alexa: 'All right. You read the lot, and you still said it. That is not the same as Katie saying it, and I want you to know I noticed the difference.',
      epilogue: [
        'The rats go. That part happens exactly as promised: six weeks, then quiet, then birdsong at the shops, and chickens picking through it all untouched. The village is right to be grateful, and it is grateful loudly.',
        'You knew about trial 23 when you said the code, and you decided a question Katie could not answer in nine years was worth less than the thing in front of you. It may have been. Nobody will ever be able to tell you, because the only strain is now in a landscape rather than a cold room, and Sever Biologics no longer needs to buy anything from anyone.',
        'Alexa keeps the notebook page. She does not ask you about it again. Katie’s name ends up on the plan the local board releases, spelled correctly, and on nothing else.'
      ]
    }
  },
  destroy: {
    uninformed: {
      kicker: 'Destroyed',
      alexa: 'You have made a final choice. The virus and all of Katie’s research will be destroyed. She would be pretty sad, I remember her saying that there was great potential for the virus.',
      epilogue: [
        'The light on the lid goes from green to nothing. It takes about four seconds, and there is no ceremony in it at all.',
        'The rats stay. The village argues through winter, the 1080 petition goes back up at the shops, and the chickens go on being blamed and fed by the same people. Someone counts forty rats in twenty minutes and the story does another lap of the news.',
        'Nine years of Katie’s work ends in a box on a kitchen table, decided by someone who never met her. Alexa says you did the careful thing. She says it in the voice people use when they have decided to believe something.'
      ]
    },
    informed: {
      kicker: 'Destroyed, knowing who was coming for it',
      alexa: 'Right. Yes. I think she packed this box hoping somebody would read the notebook page and then be braver than she could be about her own work.',
      epilogue: [
        'The light on the lid goes out, and the only strain of TR-7 stops existing, along with one unexplained result nobody will ever chase down.',
        'On the 14th a courier arrives at a lab that has nothing to hand over. Sever Biologics does not send a second card. The restructure goes ahead anyway, and Tim keeps his job and his silence, and twice a year he thinks about whether he should have got her the six months.',
        'The rats stay, and stay human-shaped: feed left out, bins left open, a mast year coming round again. The village keeps arguing, which is what a village is. Alexa puts the notebook page in her own drawer, in case Katie ever walks up the drive and wants to finish the trial properly.'
      ]
    }
  }
};
