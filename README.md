# readme

This is an immersive moral dilemma game called "Open the Chicken Coop." You've found a box belonging to Katie Yeung, a scientist who has gone missing. Inside the box are clues about a virus she developed that could eradicate rats, which were becoming a major problem in her community of Titirangi due to the large feral chicken population. 

The choice is now yours - you can either release Katie's virus to get rid of the rats, or destroy it and her research. I'm playing the role of Alexa, Katie's friend, who is providing context about the situation. You can ask me questions to learn more, and when you're ready to make your decision, you'll need to give me one of the command codes Katie left behind.

It's an interactive narrative experience that explores the ethical dilemmas around using biotechnology and dealing with invasive species. The fate of Katie's research is in your hands based on the evidence you uncover.

# chickencoop
Open the Chicken Coop

[Play the browser demo](https://richdurham.github.io/chickencoop/demo/) — the whole game in one page: dig through Katie's box (move things to see what's underneath, turn photos over, leaf through the folder, take things out of the kete and the envelope), talk to Alexa, and say a command code. The box contents are web-sized copies of `Open-the-chicken-coop-game-files`, kept in [`demo/box/`](demo/box/), and the item list, the box's starting arrangement and Alexa's script live in [`demo/data.js`](demo/data.js).

Alexa understands questions in plain language. A small sentence-embedding model (all-MiniLM-L6-v2, about 33 MB with its runtime, served from [`demo/model/`](demo/model/) and [`demo/lib/`](demo/lib/)) loads in the background once the box opens and compares each question with example questions for her scripted answers. When she's fairly but not fully sure, she hedges; if a question is about an item her script doesn't cover, she says so. Command codes are still matched word for word. Until the model is ready, or on devices that can't run it, she matches key words. To tune the example questions in `demo/data.js`, open the demo with `?debug` on the end of the address and watch the browser console.

[PartyRock text AI chat version](https://partyrock.aws/u/richdurham/e1B7QinQ7/Alexa-Open-the-Chicken-Coop)

[Weird Dopple.ai verson with vocal responses](https://beta.dopple.ai/profile/82513e14-ca2b-4238-9a5e-0905eb6d3597)

[CNN article](https://richdurham.github.io/chickencoop/cnnarticle.html)

Wait, you're not Katie! You must have found her box...I guess the decision is up to you now. Katie was a researcher at C Five biotech, and she was very active in our local community. She was trying to help out with a chicken crisis, now you have the choice to preserve her research or destroy it. Take a look in her box, because it is not as simple as it sounds. When you are ready to make a choice, you can provide me with one of the command codes she left behind. I was also a good friend of Katie's, so you can ask me questions about her or things you find in the box. 
