/* Open the Chicken Coop — story content.
   Items are the real contents of Katie's box (images in box/, made from
   Open-the-chicken-coop-game-files). Alexa's lines are the Alexa Blueprint
   script, word for word. */

const INTRO_PHRASES = [
  'alexa open the chicken coop',
  'open the chicken coop',
  'alexa open chicken coop',
  'open chicken coop',
  'open a chicken coop' // how speech recognition sometimes hears "open the chicken coop"
];

/* Each item's images are box/<id>-<n>.jpg, with a smaller copy at
   box/thumb/<id>.jpg (w x h) for the pile. Items with `cut` were photographed
   on a table and use background-free versions, box/cut/<id>.webp and
   box/cut/thumb/<id>.webp (and box/cut/<id>-<n>.webp for their other sides).
   `in` puts an item inside another, so it isn't on the pile at the start: the
   folder's documents are found by leafing through it, and what's in an item
   with `reach` (the kete, the envelope; the button says how) is taken out one
   thing at a time and put down beside it.
   `sides` names the pages of things that turn over or open (2 sides flip,
   more leaf). Everything flat turns over, whether or not there's anything on
   the back, so nothing tells players which things matter. (The box's lid
   doesn't: its top is seen when the box is closed.) The things themselves are
   gone, so backs that were never photographed were made from their fronts, by
   tools/box-images/backs.py. `label` and `caption` (heard by screen readers)
   say what something is, never what to notice. `credit` ({ text, href })
   attributes a stand-in photo that didn't come from the real box.
   For understanding questions: `name` is how Alexa refers to the item,
   `about` says only what is visible on it (never shown or spoken; it helps
   tell which item a question is about), and `links` lists the QA answers
   the visible content plainly relates to. Links are the one place a puzzle
   could leak, so items whose meaning players are meant to work out have none. */
const ITEMS = [
  { id: 'lid-note', cut: true, label: 'Pink post-it', caption: 'A pink post-it note with handwriting on it.', pages: 2, sides: ['Front', 'Back'], w: 560, h: 420,
    name: 'the pink post-it', links: ['tim', 'postit'],
    about: ['A pink post-it note stuck on the lid of the box, handwritten and signed Tim.', 'A handwritten note from Tim on top of the box.', 'It says Alexa called and asked for Katie\'s things to be packed up and sent to her, and that he packed it himself.'] },
  { id: 'lid-inside', label: 'The lid', caption: 'The lid of the box.', pages: 1, w: 560, h: 420,
    name: 'the writing inside the lid', links: ['coop'],
    about: ['Handwriting on the inside of the box lid that says: Alexa, open the chicken coop.'] },

  { id: 'wrinkled-note', cut: true, label: 'Crumpled printout', caption: 'A crumpled printed page.', pages: 2, sides: ['Front', 'Back'], w: 433, h: 560,
    name: 'the crumpled printout', links: ['katie', 'postit'],
    about: ['A crumpled printed email from Katie to Alexa about a delivery.', 'Handwriting across it says: ask Alexa to open the chicken coop.'] },
  { id: 'kete', cut: true, label: 'Kete', caption: 'A small woven flax kete.', pages: 1, w: 600, h: 594, reach: 'Reach inside',
    name: 'the kete', links: [],
    about: ['A small woven flax kete, a Maori bag with handles.'] },
  { id: 'dog-tags', cut: true, in: 'kete', label: 'Dog tags', caption: 'Dog tags on ball chains.', pages: 2, sides: ['Front', 'Back'], w: 600, h: 451,
    name: 'the dog tags', links: [],
    about: ['Two metal dog tags on a ball chain, stamped Name, Age, Sex, Blood and Birth, with worn letters punched beside them; of the name only its first letter, a K, can be read.', 'Three small clear round capsules on ball chains.'] },
  { id: 'kete-note', cut: true, in: 'kete', label: 'Paper from the kete', caption: 'A sheet of paper, folded over at the top.', pages: 2, sides: ['Front', 'Back'], w: 420, h: 560,
    name: 'the paper from the kete', links: [],
    about: ['A folded sheet of white paper with September 2018 written on it in green ink.'] },
  { id: 'boarding-pass', label: 'Boarding pass', caption: 'A boarding pass.', pages: 2, sides: ['Front', 'Back'], w: 560, h: 231,
    name: 'the boarding pass', links: [],
    about: ['A red and white airline boarding pass for a flight from Moscow to Auckland on 12 November 2018.'] },
  { id: 'coins', cut: true, label: 'Coins', caption: 'Two coins.', pages: 2, sides: ['Front', 'Back'], w: 600, h: 338,
    credit: { text: 'Stand-in photos (the box’s coins are gone): riversxian on Numista, CC BY 4.0, cut out and laid together', href: 'https://en.numista.com/2378' },
    name: 'the coins', links: ['coins'],
    about: ['Two Croatian coins, a 5 kuna and a 1 kuna, with a marten on one side and a brown bear or a nightingale on the other.'] },
  { id: 'certificate', label: 'Certificate', caption: 'A certificate of achievement.', pages: 2, sides: ['Front', 'Back'], w: 560, h: 378,
    name: 'the certificate', links: [],
    about: ['A certificate of achievement with a blue patterned border, a gold seal and two signatures, for contributions to science.'] },
  { id: 'plant', cut: true, label: 'Plant cutting', caption: 'A cutting from a plant.', pages: 1, w: 420, h: 560,
    name: 'the plant cutting', links: [],
    about: ['A cutting of a green plant with curly fern-like shoots.', 'A handwritten paper label is wrapped around the stem.'] },
  { id: 'glasses', cut: true, label: 'Glasses', caption: 'A pair of glasses.', pages: 1, w: 560, h: 420,
    name: 'the glasses', links: [],
    about: ['A pair of black-framed glasses.'] },
  { id: 'mug', cut: true, label: 'Mug', caption: 'An empty mug.', pages: 1, w: 420, h: 560,
    name: 'the mug', links: [],
    about: ['An empty white mug with black stripes.'] },
  { id: 'release-slip', cut: true, label: 'Strip of paper', caption: 'A strip of lined paper.', pages: 2, sides: ['Front', 'Back'], w: 560, h: 182,
    name: 'the strip of paper', links: ['choose'],
    about: ['A strip of lined paper torn off a notepad, handwritten: Release falcon 616.', 'One of the command codes, written down.'] },
  { id: 'destroy-slip', cut: true, label: 'Scrap of paper', caption: 'A torn scrap of paper.', pages: 2, sides: ['Front', 'Back'], w: 560, h: 468,
    name: 'the scrap of paper', links: ['choose'],
    about: ['A torn scrap of plain paper, folded in half, handwritten: Destroy falcon 264.', 'One of the command codes, written down.'] },

  { id: 'family-photo', label: 'Family photo', caption: 'A family portrait.', pages: 2, sides: ['Front', 'Back'], w: 362, h: 560,
    name: 'the family photo', links: ['ken', 'katie'],
    about: ['A family portrait in a photo stand: a man and a woman, both wearing glasses, with a young boy and a little girl.'] },
  { id: 'summer-school', label: 'Group photo', caption: 'A group photo outside a building.', pages: 2, sides: ['Front', 'Back'], w: 560, h: 314,
    name: 'that group photo', links: ['igor'],
    about: ['A group photo of about a dozen people standing outside a large building.', 'Handwritten notes on the back mention Igor, Korsakov and a 1995 summer school in Novosibirsk.'] },
  { id: 'who-trip', label: 'Group photo on the steps', caption: 'A group photo on some steps.', pages: 2, sides: ['Front', 'Back'], w: 560, h: 397,
    name: 'the photo on the steps', links: ['c5'],
    about: ['A group photo of people standing on the steps outside a building with World Health Organization logos.', 'Written on the back: C5, WHO trip, September 2017.'] },
  { id: 'envelope', label: 'Envelope', caption: 'A white envelope.', pages: 2, sides: ['Front', 'Back'], w: 560, h: 485, reach: 'Open it',
    name: 'the envelope', links: [],
    about: ['A white envelope with Katie handwritten on the front.'] },
  { id: 'card', in: 'envelope', label: 'Get-well card', caption: 'A get-well card.', pages: 3, sides: ['Front', 'Inside', 'Back'], w: 397, h: 560,
    name: 'the get-well card', links: ['tim'],
    about: ['A floral get well soon card.', 'Inside it is signed by her colleagues, including Tim, Barbara, Josh and Tony.', 'A greeting card with handwritten messages from her workmates.'] },

  { id: 'folder-cover', label: 'The folder', caption: 'A black ring binder.', pages: 1, w: 433, h: 560,
    name: 'the folder', links: [],
    about: ['A black ring binder with Project Cleansing Falcon handwritten in red on the spine.'] },
  { id: 'council', in: 'folder-cover', label: 'Auckland Council printout', caption: 'A printed council news article.', pages: 2, w: 396, h: 560,
    name: 'the council printout', links: ['titirangi'],
    about: ['A printed Auckland Council news article about wild chickens and rats in Titirangi, with highlighting and handwritten notes.'] },
  { id: 'cnn', in: 'folder-cover', label: 'CNN printout', caption: 'A printed CNN article.', pages: 4, w: 396, h: 560,
    name: 'the CNN printout', links: ['titirangi'],
    about: ['A printed CNN article about a rat infestation in the New Zealand suburb of Titirangi, with highlighting and handwritten notes.'] },
  { id: 'medical', in: 'folder-cover', label: 'Medical News Today printout', caption: 'A printed Medical News Today article.', pages: 3, w: 396, h: 560,
    name: 'the Medical News Today printout', links: [],
    about: ['A printed Medical News Today article about a virus that could help destroy cancer, with highlighting and handwritten notes.'] },
  { id: 'business-card', in: 'folder-cover', label: 'Business card', caption: 'A copy of a business card.', pages: 1, w: 396, h: 560,
    name: 'the business card', links: ['igor', 'linkedin'],
    about: ['A photocopy of a business card for Igor Kuznetsov, a regional manager at a biotechnology company, with a handwritten note beside it.'] },
  { id: 'emails', in: 'folder-cover', label: 'Printed emails', caption: 'Two printed emails.', pages: 2, w: 396, h: 560,
    name: 'the printed emails', links: ['igor', 'dubrovnik'],
    about: ['Two printed emails: one between Katie and Igor Kuznetsov after a conference in Dubrovnik, and one to Miss Yeung about an agreement.'] },
  { id: 'nova', in: 'folder-cover', label: 'NOVA Online printout', caption: 'A printed NOVA Online interview.', pages: 4, w: 396, h: 560,
    name: 'the NOVA printout', links: [],
    about: ['A printed NOVA Online interview with two scientists, with highlighting, handwritten notes and a blue sticky note.'] }
];

/* How the box looks when first opened, bottom of the pile first. Each entry is
   [x, y, width, angle]: x and y are where the item's centre sits inside the
   box (0-100 across and down; beyond that is the table around it), width is
   a percentage of the box's width, angle is in degrees. The lid lies outside
   the box, so it has its own place for wide and narrow screens. Players move
   everything; their arrangement is saved, this is only the start.
   Katie's two command codes are on slips at the bottom, for players to find. */
const PILE = [
  ['release-slip', 58, 78, 30, 7],
  ['destroy-slip', 55, 38, 17, -12],
  ['certificate', 34, 68, 47, -8],
  ['envelope', 75, 73, 34, 12],
  ['folder-cover', 50, 45, 47, 24],
  ['who-trip', 78, 20, 33, -4],
  ['family-photo', 22, 20, 20, 6],
  ['summer-school', 45, 12, 33, -9],
  ['kete', 86, 49, 28, 8],
  ['boarding-pass', 25, 87, 34, 4],
  ['plant', 14, 55, 15, -20],
  ['glasses', 61, 86, 24, -12],
  ['mug', 90, 90, 17, 0],
  ['coins', 46, 72, 17, -6],
  ['wrinkled-note', 34, 40, 28, -14],
  ['lid-note', 59, 30, 16, 9]
];
const LID = { id: 'lid-inside', wide: [123, 50, 53, -88], tall: [50, 125, 60, -3] };

/* Things inside the kete and the envelope land beside them when taken out:
   [width, angle], as in PILE. */
const TAKE_OUT = { 'dog-tags': [24, -10], 'kete-note': [13, -14], card: [22, 6] };

/* Alexa Blueprint: welcome and exit. */
const WELCOME = [
  'Wait, you’re not Katie! You must have found her box… I guess the decision is up to you now.',
  'Katie was a researcher at C Five biotech, and she was very active in our local community. She was trying to help out with a chicken crisis, now you have the choice to preserve her research or destroy it.',
  'Take a look in her box, because it is not as simple as it sounds. When you are ready to make a choice, you can provide me with one of the command codes she left behind. I was also a good friend of Katie’s, so you can ask me questions about her or things you find in the box.'
];

const EXIT = 'Goodbye for now. If you want to contact me again, ask me to open the chicken coop.';

const START_HINT = 'That’s a command for me to start the game. Tell me as written, Alexa, open the chicken coop.';

/* Names and words from the game that speech recognition would otherwise
   mishear. Whisper (listen-worker.js) is primed with them. */
const VOICE_WORDS = 'Alexa, Katie, Ken, Tim, Igor Kuznetsov, Titirangi, Dubrovnik, C Five, kete, falcon, cleansing.';

/* Alexa Blueprint: QA. Each entry is one scripted answer (`a`, word for word).
   `examples` are natural questions that mean it; the model compares a
   player's question with these by meaning. `keys` are phrases for the simple
   word matcher used while the model loads (the longest phrase found wins).
   `topic` names the answer in a hedge ("I think maybe you're asking about
   ..."); answers without one get the plain hedge. */
const QA = [
  {
    id: 'katie', topic: 'Katie',
    keys: ['who is katie', 'katie yeung', 'about katie', 'katie'],
    examples: ['Who is Katie?', 'Tell me about Katie', 'Who is Katie Yeung?', 'How do you know Katie?', 'What was Katie like?',
      'Who does this box belong to?', 'Tell me about your friend', 'Tell me more about her', 'Were you close to Katie?', 'How did you meet Katie?',
      'Are you Katie’s friend?'],
    a: 'We grew up together, and we talked all the time. Katie was really active in our Titirangi community. She was very stressed the last times I saw her, I think about the chicken crisis. Katie was also a very talented researcher at C5 Biotech.'
  },
  {
    id: 'c5', topic: 'C5 Biotech',
    keys: ['what is c5 biotech', 'c5 biotech', 'c five biotech', 'c5', 'c five'],
    examples: ['What is C5 Biotech?', 'What does C5 do?', 'Where did Katie work?', 'What company did Katie work for?',
      'What does the company do?', 'Tell me about the lab', 'What kind of research does C5 do?'],
    a: 'C5 Biotech is a biotechnology lab. I’m pretty sure they are involved in cancer research. But then it also had something do with the rats.'
  },
  {
    id: 'igor', topic: 'Igor',
    keys: ['who is igor', 'igor kutznetsov', 'igor kuznetsov', 'kutznetsov', 'kuznetsov', 'igor', 'business card'],
    examples: ['Who is Igor?', 'Who is Igor Kutznetsov?', 'Tell me about Igor Kuznetsov', 'Who is the Russian scientist?',
      'Who did Katie meet at the conference?', 'Who is the man from Russia?'],
    a: 'I don’t know. Igor something. Maybe look him up on Linked In? Katie did say something about Russian scientists from a conference trip.'
  },
  {
    id: 'linkedin', topic: 'looking Igor up',
    keys: ['cant find igor', 'cannot find igor', 'igor on linkedin', 'linkedin', 'linked in'],
    examples: ['I can’t find Igor on LinkedIn', 'Igor isn’t on LinkedIn', 'I searched LinkedIn and found nothing',
      'I looked for Igor online but couldn’t find him', 'I can’t find him anywhere online', 'I searched for Igor and found nothing',
      'There are no results for Igor', 'How do I find out more about Igor?'],
    a: 'Have a look in the box. Maybe there is a business card?'
  },
  {
    id: 'harmful', topic: 'whether the virus is safe',
    keys: ['harmful to humans', 'dangerous to humans', 'safe for humans', 'is the virus harmful', 'is the virus dangerous', 'is the virus safe', 'is it safe', 'the virus'],
    examples: ['Is the virus harmful to humans?', 'Is the virus safe?', 'Can the virus hurt people?', 'Is the virus dangerous?',
      'Will the virus make people sick?', 'Is it safe to release the virus?', 'What will happen to people if I release the virus?',
      'What would the virus do to humans?'],
    a: 'I’m not sure, I don’t understand the science really. I trust Katie, so I think it must be safe or she wouldn’t have wanted to release it. Maybe there’s some info in the box?'
  },
  {
    id: 'titirangi', topic: 'Titirangi and the rats',
    keys: ['where is titirangi', 'what is titirangi', 'problem in titirangi', 'problem with the chickens', 'titirangi', 'chickens', 'chicken crisis', 'rat problem', 'the rats', 'rats', 'cnn'],
    examples: ['Where is Titirangi?', 'What is the problem in Titirangi?', 'What is the rat problem?', 'Why are there so many rats?',
      'What’s wrong with the chickens?', 'What is the chicken crisis?', 'Why do people hate the chickens?', 'Where is this village?'],
    a: 'Titirangi is a village in West Auckland. There are lots of chickens. Some people love them and others hate them because they attract rats. The case has been on C N N. There is a lot of info in the box, Katie pulled it all together for me.'
  },
  {
    id: 'dubrovnik', topic: 'the conference in Dubrovnik',
    keys: ['conference in dubrovnik', 'the conference', 'dubrovnik', 'conference'],
    examples: ['Tell me about the conference in Dubrovnik', 'What happened at the conference?', 'Why did Katie go to Dubrovnik?',
      'When did Katie go to Croatia?', 'Tell me about her trip', 'Where did Katie travel to?'],
    a: 'Katie went to a conference in Dubrovnik in February. She showed me some pictures, it is so beautiful there. But for some reason it had stressed her out as well.'
  },
  {
    id: 'ken', topic: 'Ken',
    keys: ['who is ken', 'her husband', 'husband', 'married', 'ken', 'the kids', 'children', 'her family'],
    examples: ['Who is Ken?', 'Who is Katie’s husband?', 'Does Katie have a family?', 'Where are Katie’s kids?',
      'Is Katie married?', 'Who is in the family photo?', 'Where is her family now?', 'Tell me about Katie’s husband and kids'],
    a: 'Ken is Katie’s husband. They have two lovely small kids who go to the local kindy with my daughter. Ken is with the kids in Hong Kong at the moment, his Mum lives there.'
  },
  {
    id: 'postit', topic: 'the note',
    keys: ['same alexa', 'post it note', 'post it', 'postit'],
    examples: ['Are you the same Alexa as the one on the post-it note?', 'Are you the Alexa on the note?',
      'The post-it mentions Alexa, is that you?', 'Is the Alexa in the email you?'],
    a: 'Yes I am'
  },
  {
    id: 'infected', topic: 'whether the box is safe',
    keys: ['contents of the box', 'is the box infectious', 'can we be infected', 'can i be infected', 'infected', 'infectious'],
    examples: ['Can we be infected by the contents of the box?', 'Is the box infectious?', 'Is it safe to touch the things in the box?',
      'Could the box make me sick?', 'Is it safe to open the box?'],
    a: 'I think the box is harmless'
  },
  {
    id: 'coins', topic: 'the coins',
    keys: ['what are the coins', 'are the coins euros', 'coins', 'euros'],
    examples: ['What are the coins?', 'Are the coins euros?', 'Are the coins Russian?', 'Where are the coins from?',
      'Why are there coins in the box?', 'What currency is the money?'],
    a: 'They are euros. I guess Katie had some left over from her trip to Dubrovnik'
  },
  {
    id: 'tim',
    keys: ['who is tim', 'tim'],
    examples: ['Who is Tim?', 'Who packed the box?', 'Who wrote the pink post-it?', 'Who is Katie’s manager?', 'Who is her boss?'],
    a: 'Tim? He is Katie’s long time colleague, oh wait I think he became the manager recently. He was Katie’s favourite colleague, we met a few times at barbeques.'
  },
  {
    id: 'choose', topic: 'what to choose',
    keys: ['what should i choose', 'what would you choose', 'what do you think i should', 'what should i do', 'should i'],
    examples: ['What should I choose?', 'What would you choose?', 'What do you think I should do?', 'Should I release it or destroy it?',
      'Help me decide', 'What would you do in my place?', 'Should I release the virus?', 'Should I destroy the virus?', 'What is the right decision?', 'Which choice is the right one?'],
    a: 'Me? I trust Katie’s plan, but she clearly had some reservations because of surrounding events. You have the command codes, so the choice is clearly up to you.'
  },
  {
    id: 'whoareyou', topic: 'me',
    keys: ['who are you', 'alexa gardner', 'your name'],
    examples: ['Who are you?', 'What’s your name?', 'Who am I talking to?', 'Are you a real person?', 'Who is speaking?'],
    a: 'I am Alexa, Alexa Gardner. I am Katie’s childhood friend.'
  },
  {
    id: 'coop', topic: 'how to start',
    keys: ['what is the chicken coop', 'chicken coop', 'how do i start'],
    examples: ['What is the chicken coop?', 'How do I start?', 'What does open the chicken coop mean?'],
    a: START_HINT
  },
  {
    id: 'whatisthis', topic: 'what this is all about',
    keys: ['what is this', 'what am i doing', 'how do i play', 'what am i supposed to do'],
    examples: ['What is this?', 'What am I doing?', 'What is this game about?', 'Explain the game', 'How does this game work?', 'What am I supposed to do?'],
    a: 'A game. It’s about Katie Yeung, a scientist from C five biotech who has left behind only the contents of her desk. She was trying to solve the Chicken crisis in her community of Titirangi, and developed a virus that can eradicate only the rats. But now she’s gone, and the choice to release the virus or destroy the only sample is up to you.'
  },
  {
    id: 'exit',
    keys: ['goodbye', 'bye', 'exit', 'quit'],
    examples: ['Goodbye', 'Bye', 'I want to stop', 'I’m done for now', 'See you later'],
    a: EXIT
  }
];

/* When nothing matches, Alexa points back at the box, in her own words. */
const FALLBACKS = [
  'I’m not sure. Maybe there’s some info in the box?',
  'There is a lot of info in the box, Katie pulled it all together for me.',
  'Have a look in the box.'
];

/* Said before a scripted answer when Alexa is fairly, but not fully, sure
   what was asked. {topic} is the answer's topic. */
const HEDGES = {
  topic: 'I think maybe you’re asking about {topic}?',
  plain: 'I’m not entirely sure, but…'
};

/* When a question is clearly about an item that no scripted answer covers.
   {name} is the item's name. */
const UNKNOWN_ITEM = 'I don’t know anything about {name}, sorry. Maybe something else in the box will explain it.';

/* The command codes and Alexa's replies, from the Blueprint. */
const CODES = {
  release: {
    short: 'Release falcon 616',
    confirm: 'Your choice is to release the virus. Are you sure? Did you check all the information? If you are sure, tell me to release cleansing falcon 616.',
    final: 'You have made a final choice. The virus will be released to eradicate the rats in Titirangi and can be part of further research for example. Katie would be happy, and I’m sure nothing could go wrong.'
  },
  destroy: {
    short: 'Destroy falcon 264',
    confirm: 'Your choice is to destroy the virus. Are you sure? Did you check all the information? If you are sure add a word and tell me to destroy cleansing falcon 264',
    final: 'You have made a final choice. The virus and all of Katie’s research will be destroyed. She would be pretty sad, I remember her saying that there was great potential for the virus.'
  }
};
