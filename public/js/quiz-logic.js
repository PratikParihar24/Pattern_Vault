// public/js/quiz-logic.js

const Cipher = {
    // The QWERTY Quadrant Map
    map: {
        // Option A: Top Left
        'q': 'A', 'w': 'A', 'e': 'A', 'r': 'A', 't': 'A',
        
        // Option B: Top Right
        'y': 'B', 'u': 'B', 'i': 'B', 'o': 'B', 'p': 'B',
        
        // Option C: Left Hand Rest (Mid/Bot)
        'a': 'C', 's': 'C', 'd': 'C', 'f': 'C', 'g': 'C',
        'z': 'C', 'x': 'C', 'c': 'C', 'v': 'C',
        
        // Option D: Right Hand Rest (Mid/Bot)
        'h': 'D', 'j': 'D', 'k': 'D', 'l': 'D',
        'b': 'D', 'n': 'D', 'm': 'D'
    },

    // Helper to generate generic "Trivia Questions"
    // (These are just noise to make it look like a game)
    questions: [
        "Which planet is closest to the Sun?",
        "What is the capital of France?",
        "How many legs does a spider have?",
        "What is H2O commonly known as?",
        "Who painted the Mona Lisa?"
    ],

    getRandomQuestion: function() {
        return this.questions[Math.floor(Math.random() * this.questions.length)];
    }
};