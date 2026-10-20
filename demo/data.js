/* Open the Chicken Coop — story content.
   Items are the real contents of Katie's box (images in box/, made from
   Open-the-chicken-coop-game-files). Alexa's lines are the Alexa Blueprint
   script, word for word. */

const INTRO_PHRASES = [
  'alexa open the chicken coop',
  'open the chicken coop',
  'alexa open chicken coop',
  'open chicken coop'
];

/* Where things sit in the box. Order here is the order on the table. */
const GROUPS = [
  { id: 'lid', label: 'On the lid' },
  { id: 'loose', label: 'Loose in the box' },
  { id: 'stands', label: 'Katie’s photo stands' },
  { id: 'folder', label: 'Project Cleansing Falcon folder' }
];

/* Each item's images are box/<id>-<n>.jpg, with a table thumbnail at
   box/thumb/<id>.jpg (w x h). `sides` names the pages of two-sided things;
   `ask` is a question Alexa has a scripted answer for. */
const ITEMS = [
  { id: 'lid-note', group: 'lid', label: 'Pink post-it', caption: 'Stuck to the top of the box, signed by Tim.', pages: 1, w: 560, h: 420, ask: 'Who is Tim?' },
  { id: 'lid-inside', group: 'lid', label: 'Inside the lid', caption: 'Written on the underside of the lid.', pages: 1, w: 560, h: 420, ask: 'What is the chicken coop?' },

  { id: 'wrinkled-note', group: 'loose', label: 'Crumpled printout', caption: 'A printed email to Alexa, crumpled up, with a line written across it.', pages: 1, w: 433, h: 560, ask: 'Who is Katie?' },
  { id: 'kete', group: 'loose', label: 'Kete', caption: 'A small woven flax kete, with two tags on a chain and three clear capsules.', pages: 1, w: 420, h: 560, ask: 'Can we be infected by the contents of the box?' },
  { id: 'kete-note', group: 'loose', label: 'Paper from the kete', caption: 'Folded inside the kete, dated in green ink.', pages: 1, w: 420, h: 560 },
  { id: 'boarding-pass', group: 'loose', label: 'Boarding pass', caption: 'A boarding pass.', pages: 1, w: 560, h: 231 },
  { id: 'certificate', group: 'loose', label: 'Certificate', caption: 'A certificate of achievement.', pages: 1, w: 560, h: 378, ask: 'What is C5 Biotech?' },
  { id: 'plant', group: 'loose', label: 'Plant cutting', caption: 'A cutting with a handwritten label around the stem.', pages: 1, w: 420, h: 560, ask: 'Is the virus harmful to humans?' },
  { id: 'glasses', group: 'loose', label: 'Glasses', caption: 'A pair of glasses.', pages: 1, w: 560, h: 420 },
  { id: 'mug', group: 'loose', label: 'Mug', caption: 'An empty mug.', pages: 1, w: 420, h: 560 },

  { id: 'family-photo', group: 'stands', label: 'Family photo', caption: 'A family portrait in a photo stand.', pages: 1, w: 362, h: 560, ask: 'Who is Ken?' },
  { id: 'summer-school', group: 'stands', label: 'Group photo, with notes', caption: 'A group outside a building. There’s writing on the back.', pages: 2, sides: ['Front', 'Back'], w: 560, h: 314, ask: 'Who is Igor Kutznetsov?' },
  { id: 'who-trip', group: 'stands', label: 'Group photo on the steps', caption: 'A group on some steps. There’s writing on the back.', pages: 2, sides: ['Front', 'Back'], w: 560, h: 397, ask: 'What is C5 Biotech?' },
  { id: 'card', group: 'stands', label: 'Get-well card', caption: 'A card in an envelope addressed to Katie, signed by her colleagues.', pages: 4, sides: ['Envelope', 'Front', 'Inside', 'Back'], w: 560, h: 485, ask: 'Who is Tim?' },

  { id: 'folder-cover', group: 'folder', label: 'The folder', caption: 'A black ring binder with a handwritten spine.', pages: 1, w: 433, h: 560, ask: 'What is this?' },
  { id: 'council', group: 'folder', label: 'Auckland Council printout', caption: 'A council news article, with notes.', pages: 2, w: 396, h: 560, ask: 'What is the problem in Titirangi?' },
  { id: 'cnn', group: 'folder', label: 'CNN printout', caption: 'A CNN article, with notes.', pages: 4, w: 396, h: 560, ask: 'What is the rat problem?' },
  { id: 'medical', group: 'folder', label: 'Medical News Today printout', caption: 'A Medical News Today article, with notes.', pages: 3, w: 396, h: 560, ask: 'Is the virus harmful to humans?' },
  { id: 'business-card', group: 'folder', label: 'Business card', caption: 'A copy of a business card, with a note.', pages: 1, w: 396, h: 560, ask: 'I can’t find Igor on LinkedIn' },
  { id: 'emails', group: 'folder', label: 'Printed emails', caption: 'Two printed emails.', pages: 2, w: 396, h: 560, ask: 'Tell me about the conference in Dubrovnik' },
  { id: 'nova', group: 'folder', label: 'NOVA Online printout', caption: 'A NOVA Online interview, with notes.', pages: 4, w: 396, h: 560 }
];

/* Alexa Blueprint: welcome and exit. */
const WELCOME = [
  'Wait, you’re not Katie! You must have found her box… I guess the decision is up to you now.',
  'Katie was a researcher at C Five biotech, and she was very active in our local community. She was trying to help out with a chicken crisis, now you have the choice to preserve her research or destroy it.',
  'Take a look in her box, because it is not as simple as it sounds. When you are ready to make a choice, you can provide me with one of the command codes she left behind. I was also a good friend of Katie’s, so you can ask me questions about her or things you find in the box.'
];

const EXIT = 'Goodbye for now. If you want to contact me again, ask me to open the chicken coop.';

const START_HINT = 'That’s a command for me to start the game. Tell me as written, Alexa, open the chicken coop.';

/* Alexa Blueprint: QA. `keys` are phrases that should reach the answer;
   the matcher prefers the longest phrase that appears. */
const QA = [
  {
    keys: ['who is katie', 'katie yeung', 'about katie', 'katie', 'shihong'],
    a: 'We grew up together, and we talked all the time. Katie was really active in our Titirangi community. She was very stressed the last times I saw her, I think about the chicken crisis. Katie was also a very talented researcher at C5 Biotech.'
  },
  {
    keys: ['what is c5 biotech', 'c5 biotech', 'c five biotech', 'c5', 'c five'],
    a: 'C5 Biotech is a biotechnology lab. I’m pretty sure they are involved in cancer research. But then it also had something do with the rats.'
  },
  {
    keys: ['who is igor', 'igor kutznetsov', 'igor kuznetsov', 'kutznetsov', 'kuznetsov', 'igor'],
    a: 'I don’t know. Igor something. Maybe look him up on Linked In? Katie did say something about Russian scientists from a conference trip.'
  },
  {
    keys: ['cant find igor', 'cannot find igor', 'igor on linkedin', 'linkedin', 'linked in'],
    a: 'Have a look in the box. Maybe there is a business card?'
  },
  {
    keys: ['harmful to humans', 'dangerous to humans', 'safe for humans', 'is the virus harmful', 'is the virus dangerous', 'is the virus safe', 'the virus'],
    a: 'I’m not sure, I don’t understand the science really. I trust Katie, so I think it must be safe or she wouldn’t have wanted to release it. Maybe there’s some info in the box?'
  },
  {
    keys: ['where is titirangi', 'what is titirangi', 'problem in titirangi', 'problem with the chickens', 'titirangi', 'chickens', 'chicken crisis'],
    a: 'Titirangi is a village in West Auckland. There are lots of chickens. Some people love them and others hate them because they attract rats. The case has been on C N N. There is a lot of info in the box, Katie pulled it all together for me.'
  },
  {
    keys: ['rat problem', 'the rats', 'rats', 'cnn'],
    a: 'Titirangi is a village in West Auckland. There are lots of chickens. Some people love them and others hate them because they attract rats. The case has been on C N N. There is a lot of info in the box, Katie pulled it all together for me.'
  },
  {
    keys: ['conference in dubrovnik', 'the conference', 'dubrovnik', 'conference'],
    a: 'Katie went to a conference in Dubrovnik in February. She showed me some pictures, it is so beautiful there. But for some reason it had stressed her out as well.'
  },
  {
    keys: ['who is ken', 'her husband', 'ken', 'the kids', 'her family'],
    a: 'Ken is Katie’s husband. They have two lovely small kids who go to the local kindy with my daughter. Ken is with the kids in Hong Kong at the moment, his Mum lives there.'
  },
  {
    keys: ['same alexa', 'post it note', 'post it', 'postit'],
    a: 'Yes I am'
  },
  {
    keys: ['contents of the box', 'is the box infectious', 'can we be infected', 'can i be infected', 'infected', 'infectious'],
    a: 'I think the box is harmless'
  },
  {
    keys: ['what are the coins', 'are the coins euros', 'coins', 'euros'],
    a: 'They are euros. I guess Katie had some left over from her trip to Dubrovnik'
  },
  {
    keys: ['who is tim', 'tim'],
    a: 'Tim? He is Katie’s long time colleague, oh wait I think he became the manager recently. He was Katie’s favourite colleague, we met a few times at barbeques.'
  },
  {
    keys: ['what should i choose', 'what would you choose', 'what do you think i should', 'what should i do', 'should i'],
    a: 'Me? I trust Katie’s plan, but she clearly had some reservations because of surrounding events. You have the command codes, so the choice is clearly up to you.'
  },
  {
    keys: ['who are you', 'alexa gardner', 'your name'],
    a: 'I am Alexa, Alexa Gardner. I am Katie’s childhood friend.'
  },
  {
    keys: ['what is the chicken coop', 'chicken coop', 'how do i start', 'what am i supposed to do'],
    a: START_HINT
  },
  {
    keys: ['what is this', 'what am i doing', 'how do i play'],
    a: 'A game. It’s about Katie Yeung, a scientist from C five biotech who has left behind only the contents of her desk. She was trying to solve the Chicken crisis in her community of Titirangi, and developed a virus that can eradicate only the rats. But now she’s gone, and the choice to release the virus or destroy the only sample is up to you.'
  },
  {
    keys: ['goodbye', 'bye', 'exit', 'quit'],
    a: EXIT
  }
];

/* When nothing matches, Alexa points back at the box, in her own words. */
const FALLBACKS = [
  'I’m not sure. Maybe there’s some info in the box?',
  'There is a lot of info in the box, Katie pulled it all together for me.',
  'Have a look in the box.'
];

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
