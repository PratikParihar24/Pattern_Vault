// public/js/quiz-logic.js

const Cipher = {
    // 1. KEEP THE SECRET MAP (Crucial for the "Secret Pattern")
    // This maps keyboard keys to quadrants if you ever add desktop keyboard support
    map: {
        // Option A: Top Left
        'q': 'A', 'w': 'A', 'e': 'A', 'r': 'A', 't': 'A',
        // Option B: Top Right
        'y': 'B', 'u': 'B', 'i': 'B', 'o': 'B', 'p': 'B',
        // Option C: Left Hand Rest
        'a': 'C', 's': 'C', 'd': 'C', 'f': 'C', 'g': 'C',
        'z': 'C', 'x': 'C', 'c': 'C', 'v': 'C',
        // Option D: Right Hand Rest
        'h': 'D', 'j': 'D', 'k': 'D', 'l': 'D',
        'b': 'D', 'n': 'D', 'm': 'D'
    },

    // 2. EXPANDED DATABASE (30 Questions for "Genuine App" Credibility)
    questionBank: [
        { q: "What is the capital of France?", a: "Paris", fake: ["London", "Berlin", "Madrid"] },
        { q: "Which planet is known as the Red Planet?", a: "Mars", fake: ["Venus", "Jupiter", "Saturn"] },
        { q: "What is 2 + 2 * 2?", a: "6", fake: ["8", "4", "12"] },
        { q: "Who wrote 'Romeo and Juliet'?", a: "Shakespeare", fake: ["Dickens", "Hemingway", "Austen"] },
        { q: "What is the chemical symbol for Gold?", a: "Au", fake: ["Ag", "Fe", "Pb"] },
        { q: "How many sides does a hexagon have?", a: "6", fake: ["5", "8", "10"] },
        { q: "Which is the largest ocean on Earth?", a: "Pacific", fake: ["Atlantic", "Indian", "Arctic"] },
        { q: "What year did World War II end?", a: "1945", fake: ["1939", "1918", "1963"] },
        { q: "What represents the letter 'O' in Morse code?", a: "---", fake: ["...", ".-", "-.-"] },
        { q: "Which programming language is known as the snake?", a: "Python", fake: ["Cobra", "Java", "Viper"] },
        { q: "What is the square root of 64?", a: "8", fake: ["6", "12", "16"] },
        { q: "Which element has the atomic number 1?", a: "Hydrogen", fake: ["Helium", "Oxygen", "Carbon"] },
        { q: "What is the hardest natural substance?", a: "Diamond", fake: ["Steel", "Iron", "Quartz"] },
        { q: "Who painted the Mona Lisa?", a: "Da Vinci", fake: ["Van Gogh", "Picasso", "Monet"] },
        { q: "What is the speed of light (approx)?", a: "300,000 km/s", fake: ["150,000 km/s", "1,000 km/s", "Sound speed"] },
        { q: "Binary '10' equals what decimal number?", a: "2", fake: ["1", "3", "10"] },
        { q: "Which logic gate outputs true only if both inputs are true?", a: "AND", fake: ["OR", "XOR", "NOT"] },
        { q: "What is the main ingredient in Guacamole?", a: "Avocado", fake: ["Tomato", "Onion", "Pepper"] },
        { q: "Which continent is the Sahara Desert in?", a: "Africa", fake: ["Asia", "America", "Australia"] },
        { q: "What does HTTP stand for?", a: "HyperText Transfer Protocol", fake: ["HyperText Text Protocol", "HyperText Test Program", "None"] },
        { q: "How many bones are in the adult human body?", a: "206", fake: ["208", "210", "201"] },
        { q: "What is the currency of Japan?", a: "Yen", fake: ["Won", "Dollar", "Yuan"] },
        { q: "Which gas do plants absorb?", a: "Carbon Dioxide", fake: ["Oxygen", "Nitrogen", "Hydrogen"] },
        { q: "What is the freezing point of water?", a: "0°C", fake: ["10°C", "-10°C", "100°C"] },
        { q: "Who discovered Penicillin?", a: "Alexander Fleming", fake: ["Marie Curie", "Newton", "Einstein"] },
        { q: "What is the largest mammal?", a: "Blue Whale", fake: ["Elephant", "Giraffe", "Shark"] },
        { q: "Which instrument has 88 keys?", a: "Piano", fake: ["Guitar", "Violin", "Flute"] },
        { q: "What is the main gas found in the air we breathe?", a: "Nitrogen", fake: ["Oxygen", "Carbon Dioxide", "Hydrogen"] },
        { q: "How many colors are in a rainbow?", a: "7", fake: ["6", "8", "5"] },
        { q: "Which country invented pizza?", a: "Italy", fake: ["USA", "France", "China"] }
    ],

    // 3. THE SHUFFLER ENGINE
    // Returns: { text: "Question?", options: ["A", "B", "C", "D"], correctAnswer: "B" }
    getNewRound: function() {
        // Pick random question
        const randomQ = this.questionBank[Math.floor(Math.random() * this.questionBank.length)];
        
        // Combine correct + fake
        let options = [...randomQ.fake, randomQ.a];
        
        // Shuffle options (Fisher-Yates Algorithm)
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        return {
            text: randomQ.q,
            options: options,
            correctAnswer: randomQ.a
        };
    }
};