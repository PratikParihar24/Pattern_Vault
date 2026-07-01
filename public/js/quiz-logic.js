// public/js/quiz-logic.js

const Cipher = {
    // 1. KEEP THE SECRET MAP (Crucial for the "Secret Pattern")
    map: {
        'q': 'A', 'w': 'A', 'e': 'A', 'r': 'A', 't': 'A',
        'y': 'B', 'u': 'B', 'i': 'B', 'o': 'B', 'p': 'B',
        'a': 'C', 's': 'C', 'd': 'C', 'f': 'C', 'g': 'C',
        'z': 'C', 'x': 'C', 'c': 'C', 'v': 'C',
        'h': 'D', 'j': 'D', 'k': 'D', 'l': 'D',
        'b': 'D', 'n': 'D', 'm': 'D'
    },

    // 2. EXPANDED DATABASE — 4 Domains × 3 Difficulties × 25 Questions = 300 Qs
    questionBank: [
        // ===================================================================
        //  DOMAIN: General Knowledge
        // ===================================================================
        // --- GK: Easy ---
        { q: "What is the capital of France?", a: "Paris", fake: ["London", "Berlin", "Madrid"], domain: "gk", difficulty: "easy" },
        { q: "How many continents are there?", a: "7", fake: ["5", "6", "8"], domain: "gk", difficulty: "easy" },
        { q: "What color is a banana when ripe?", a: "Yellow", fake: ["Green", "Red", "Blue"], domain: "gk", difficulty: "easy" },
        { q: "How many days are in a week?", a: "7", fake: ["5", "6", "10"], domain: "gk", difficulty: "easy" },
        { q: "What is the main ingredient in bread?", a: "Flour", fake: ["Sugar", "Butter", "Salt"], domain: "gk", difficulty: "easy" },
        { q: "Which animal is known as man's best friend?", a: "Dog", fake: ["Cat", "Horse", "Parrot"], domain: "gk", difficulty: "easy" },
        { q: "How many colors are in a rainbow?", a: "7", fake: ["6", "8", "5"], domain: "gk", difficulty: "easy" },
        { q: "What is the main ingredient in Guacamole?", a: "Avocado", fake: ["Tomato", "Onion", "Pepper"], domain: "gk", difficulty: "easy" },
        { q: "Which country invented pizza?", a: "Italy", fake: ["USA", "France", "China"], domain: "gk", difficulty: "easy" },
        { q: "What instrument has 88 keys?", a: "Piano", fake: ["Guitar", "Violin", "Flute"], domain: "gk", difficulty: "easy" },
        { q: "How many hours are in a day?", a: "24", fake: ["12", "48", "36"], domain: "gk", difficulty: "easy" },
        { q: "What is the opposite of 'hot'?", a: "Cold", fake: ["Warm", "Mild", "Cool"], domain: "gk", difficulty: "easy" },
        { q: "Which season comes after spring?", a: "Summer", fake: ["Winter", "Autumn", "Monsoon"], domain: "gk", difficulty: "easy" },
        { q: "What shape has three sides?", a: "Triangle", fake: ["Square", "Circle", "Pentagon"], domain: "gk", difficulty: "easy" },
        { q: "What do bees produce?", a: "Honey", fake: ["Milk", "Silk", "Wax"], domain: "gk", difficulty: "easy" },
        { q: "How many letters in the English alphabet?", a: "26", fake: ["24", "28", "30"], domain: "gk", difficulty: "easy" },
        { q: "What is the largest fruit?", a: "Jackfruit", fake: ["Watermelon", "Pumpkin", "Coconut"], domain: "gk", difficulty: "easy" },
        { q: "Which planet do we live on?", a: "Earth", fake: ["Mars", "Venus", "Jupiter"], domain: "gk", difficulty: "easy" },
        { q: "What is frozen water called?", a: "Ice", fake: ["Snow", "Steam", "Frost"], domain: "gk", difficulty: "easy" },
        { q: "How many months have 31 days?", a: "7", fake: ["6", "5", "8"], domain: "gk", difficulty: "easy" },
        { q: "What is baby cat called?", a: "Kitten", fake: ["Puppy", "Cub", "Foal"], domain: "gk", difficulty: "easy" },
        { q: "Which meal is eaten in the morning?", a: "Breakfast", fake: ["Lunch", "Dinner", "Supper"], domain: "gk", difficulty: "easy" },
        { q: "What do you use to write on a blackboard?", a: "Chalk", fake: ["Pen", "Pencil", "Marker"], domain: "gk", difficulty: "easy" },
        { q: "How many wheels does a bicycle have?", a: "2", fake: ["3", "4", "1"], domain: "gk", difficulty: "easy" },
        { q: "What is the boiling point of water?", a: "100°C", fake: ["50°C", "200°C", "0°C"], domain: "gk", difficulty: "easy" },

        // --- GK: Medium ---
        { q: "Who painted the Mona Lisa?", a: "Da Vinci", fake: ["Van Gogh", "Picasso", "Monet"], domain: "gk", difficulty: "medium" },
        { q: "What is the currency of Japan?", a: "Yen", fake: ["Won", "Dollar", "Yuan"], domain: "gk", difficulty: "medium" },
        { q: "Who wrote 'Romeo and Juliet'?", a: "Shakespeare", fake: ["Dickens", "Hemingway", "Austen"], domain: "gk", difficulty: "medium" },
        { q: "What is the hardest natural substance?", a: "Diamond", fake: ["Steel", "Iron", "Quartz"], domain: "gk", difficulty: "medium" },
        { q: "Which gas do plants absorb?", a: "Carbon Dioxide", fake: ["Oxygen", "Nitrogen", "Hydrogen"], domain: "gk", difficulty: "medium" },
        { q: "Who discovered Penicillin?", a: "Alexander Fleming", fake: ["Marie Curie", "Newton", "Einstein"], domain: "gk", difficulty: "medium" },
        { q: "What is the largest mammal?", a: "Blue Whale", fake: ["Elephant", "Giraffe", "Shark"], domain: "gk", difficulty: "medium" },
        { q: "What is the main gas in the air we breathe?", a: "Nitrogen", fake: ["Oxygen", "CO2", "Hydrogen"], domain: "gk", difficulty: "medium" },
        { q: "Which organ pumps blood in the body?", a: "Heart", fake: ["Brain", "Liver", "Lungs"], domain: "gk", difficulty: "medium" },
        { q: "What is the freezing point of water?", a: "0°C", fake: ["10°C", "-10°C", "100°C"], domain: "gk", difficulty: "medium" },
        { q: "How many bones in the adult human body?", a: "206", fake: ["208", "210", "201"], domain: "gk", difficulty: "medium" },
        { q: "What is the speed of light (approx)?", a: "300,000 km/s", fake: ["150,000 km/s", "1,000 km/s", "Sound speed"], domain: "gk", difficulty: "medium" },
        { q: "What is the smallest country in the world?", a: "Vatican City", fake: ["Monaco", "Malta", "Liechtenstein"], domain: "gk", difficulty: "medium" },
        { q: "Who invented the telephone?", a: "Alexander Graham Bell", fake: ["Edison", "Tesla", "Marconi"], domain: "gk", difficulty: "medium" },
        { q: "What is the tallest mountain in the world?", a: "Mount Everest", fake: ["K2", "Kilimanjaro", "Denali"], domain: "gk", difficulty: "medium" },
        { q: "How many teeth does an adult have?", a: "32", fake: ["28", "30", "36"], domain: "gk", difficulty: "medium" },
        { q: "Which blood type is the universal donor?", a: "O-", fake: ["A+", "AB+", "B-"], domain: "gk", difficulty: "medium" },
        { q: "What does DNA stand for?", a: "Deoxyribonucleic Acid", fake: ["Dinitro Acid", "Dynamic Nuclear Acid", "Dual Nucleic Acid"], domain: "gk", difficulty: "medium" },
        { q: "What is the largest desert in the world?", a: "Sahara", fake: ["Gobi", "Arctic", "Kalahari"], domain: "gk", difficulty: "medium" },
        { q: "What vitamin does sunlight provide?", a: "Vitamin D", fake: ["Vitamin A", "Vitamin C", "Vitamin B12"], domain: "gk", difficulty: "medium" },
        { q: "How many players on a soccer team?", a: "11", fake: ["9", "10", "12"], domain: "gk", difficulty: "medium" },
        { q: "What is the chemical symbol for water?", a: "H₂O", fake: ["CO₂", "O₂", "NaCl"], domain: "gk", difficulty: "medium" },
        { q: "What is the longest river in the world?", a: "Nile", fake: ["Amazon", "Yangtze", "Mississippi"], domain: "gk", difficulty: "medium" },
        { q: "Which planet is closest to the Sun?", a: "Mercury", fake: ["Venus", "Earth", "Mars"], domain: "gk", difficulty: "medium" },
        { q: "What currency does the UK use?", a: "Pound Sterling", fake: ["Euro", "Dollar", "Franc"], domain: "gk", difficulty: "medium" },

        // --- GK: Hard ---
        { q: "What is the Fibonacci sequence starting pair?", a: "0, 1", fake: ["1, 2", "1, 1", "0, 2"], domain: "gk", difficulty: "hard" },
        { q: "Which country has the most time zones?", a: "France", fake: ["Russia", "USA", "China"], domain: "gk", difficulty: "hard" },
        { q: "What is the rarest blood type?", a: "AB-", fake: ["O-", "B-", "A-"], domain: "gk", difficulty: "hard" },
        { q: "What is the only letter not in any US state name?", a: "Q", fake: ["X", "Z", "J"], domain: "gk", difficulty: "hard" },
        { q: "How many hearts does an octopus have?", a: "3", fake: ["1", "2", "5"], domain: "gk", difficulty: "hard" },
        { q: "What is the fear of long words called?", a: "Hippopotomonstrosesquippedaliophobia", fake: ["Arachnophobia", "Trypophobia", "Glossophobia"], domain: "gk", difficulty: "hard" },
        { q: "What metal has the highest melting point?", a: "Tungsten", fake: ["Iron", "Titanium", "Platinum"], domain: "gk", difficulty: "hard" },
        { q: "What is the most spoken language in the world?", a: "Mandarin Chinese", fake: ["English", "Spanish", "Hindi"], domain: "gk", difficulty: "hard" },
        { q: "What year was the first email sent?", a: "1971", fake: ["1981", "1969", "1990"], domain: "gk", difficulty: "hard" },
        { q: "How many symphonies did Beethoven compose?", a: "9", fake: ["5", "12", "7"], domain: "gk", difficulty: "hard" },
        { q: "What is the deepest point in the ocean?", a: "Mariana Trench", fake: ["Puerto Rico Trench", "Java Trench", "Tonga Trench"], domain: "gk", difficulty: "hard" },
        { q: "What is the only even prime number?", a: "2", fake: ["4", "0", "6"], domain: "gk", difficulty: "hard" },
        { q: "Which country consumes the most coffee per capita?", a: "Finland", fake: ["Brazil", "USA", "Italy"], domain: "gk", difficulty: "hard" },
        { q: "What is the largest organ of the human body?", a: "Skin", fake: ["Liver", "Brain", "Heart"], domain: "gk", difficulty: "hard" },
        { q: "How many moons does Mars have?", a: "2", fake: ["0", "1", "4"], domain: "gk", difficulty: "hard" },
        { q: "What gas makes up ~21% of Earth's atmosphere?", a: "Oxygen", fake: ["Nitrogen", "CO2", "Argon"], domain: "gk", difficulty: "hard" },
        { q: "Which planet rotates on its side?", a: "Uranus", fake: ["Neptune", "Saturn", "Venus"], domain: "gk", difficulty: "hard" },
        { q: "What is the speed of sound at sea level (approx)?", a: "343 m/s", fake: ["300 m/s", "500 m/s", "100 m/s"], domain: "gk", difficulty: "hard" },
        { q: "Which element is liquid at room temperature?", a: "Mercury", fake: ["Lead", "Gallium", "Bromine"], domain: "gk", difficulty: "hard" },
        { q: "What is the SI unit of force?", a: "Newton", fake: ["Pascal", "Joule", "Watt"], domain: "gk", difficulty: "hard" },
        { q: "What phenomenon causes a stick to look bent in water?", a: "Refraction", fake: ["Reflection", "Diffraction", "Dispersion"], domain: "gk", difficulty: "hard" },
        { q: "What is the most abundant element in the universe?", a: "Hydrogen", fake: ["Helium", "Oxygen", "Carbon"], domain: "gk", difficulty: "hard" },
        { q: "Who formulated the three laws of motion?", a: "Isaac Newton", fake: ["Einstein", "Galileo", "Tesla"], domain: "gk", difficulty: "hard" },
        { q: "What is absolute zero in Celsius?", a: "-273.15°C", fake: ["-100°C", "-459°C", "0°C"], domain: "gk", difficulty: "hard" },
        { q: "What is the strongest muscle in the human body?", a: "Masseter (Jaw)", fake: ["Biceps", "Heart", "Gluteus"], domain: "gk", difficulty: "hard" },

        // ===================================================================
        //  DOMAIN: Science
        // ===================================================================
        // --- Science: Easy ---
        { q: "What planet is known as the Red Planet?", a: "Mars", fake: ["Venus", "Jupiter", "Saturn"], domain: "science", difficulty: "easy" },
        { q: "What is the chemical symbol for Gold?", a: "Au", fake: ["Ag", "Fe", "Pb"], domain: "science", difficulty: "easy" },
        { q: "How many sides does a hexagon have?", a: "6", fake: ["5", "8", "10"], domain: "science", difficulty: "easy" },
        { q: "Which is the largest ocean on Earth?", a: "Pacific", fake: ["Atlantic", "Indian", "Arctic"], domain: "science", difficulty: "easy" },
        { q: "What is the square root of 64?", a: "8", fake: ["6", "12", "16"], domain: "science", difficulty: "easy" },
        { q: "Which element has atomic number 1?", a: "Hydrogen", fake: ["Helium", "Oxygen", "Carbon"], domain: "science", difficulty: "easy" },
        { q: "What force keeps us on the ground?", a: "Gravity", fake: ["Friction", "Magnetism", "Inertia"], domain: "science", difficulty: "easy" },
        { q: "What is the center of an atom called?", a: "Nucleus", fake: ["Electron", "Proton", "Shell"], domain: "science", difficulty: "easy" },
        { q: "What type of animal is a frog?", a: "Amphibian", fake: ["Reptile", "Mammal", "Fish"], domain: "science", difficulty: "easy" },
        { q: "What gas do humans exhale?", a: "Carbon Dioxide", fake: ["Oxygen", "Nitrogen", "Helium"], domain: "science", difficulty: "easy" },
        { q: "What is the nearest star to Earth?", a: "The Sun", fake: ["Proxima Centauri", "Sirius", "Polaris"], domain: "science", difficulty: "easy" },
        { q: "Which gas is used to fill balloons to make them float?", a: "Helium", fake: ["Hydrogen", "Nitrogen", "Oxygen"], domain: "science", difficulty: "easy" },
        { q: "What is the chemical formula for table salt?", a: "NaCl", fake: ["KCl", "CaCl₂", "NaOH"], domain: "science", difficulty: "easy" },
        { q: "How many planets are in our solar system?", a: "8", fake: ["7", "9", "10"], domain: "science", difficulty: "easy" },
        { q: "What is the process plants use to make food?", a: "Photosynthesis", fake: ["Respiration", "Digestion", "Osmosis"], domain: "science", difficulty: "easy" },
        { q: "What are the three states of matter?", a: "Solid, Liquid, Gas", fake: ["Hot, Cold, Warm", "Hard, Soft, Fluid", "Dense, Light, Air"], domain: "science", difficulty: "easy" },
        { q: "What organ do we use to see?", a: "Eyes", fake: ["Ears", "Nose", "Tongue"], domain: "science", difficulty: "easy" },
        { q: "What is the chemical symbol for Iron?", a: "Fe", fake: ["Ir", "In", "I"], domain: "science", difficulty: "easy" },
        { q: "What part of the plant conducts photosynthesis?", a: "Leaves", fake: ["Roots", "Stem", "Flowers"], domain: "science", difficulty: "easy" },
        { q: "What instrument measures temperature?", a: "Thermometer", fake: ["Barometer", "Speedometer", "Altimeter"], domain: "science", difficulty: "easy" },
        { q: "Is the sun a star or a planet?", a: "Star", fake: ["Planet", "Moon", "Asteroid"], domain: "science", difficulty: "easy" },
        { q: "What is the largest planet in our solar system?", a: "Jupiter", fake: ["Saturn", "Neptune", "Uranus"], domain: "science", difficulty: "easy" },
        { q: "How many legs does a spider have?", a: "8", fake: ["6", "10", "12"], domain: "science", difficulty: "easy" },
        { q: "What is rain made of?", a: "Water", fake: ["Acid", "Salt", "Minerals"], domain: "science", difficulty: "easy" },
        { q: "What color is chlorophyll?", a: "Green", fake: ["Red", "Blue", "Yellow"], domain: "science", difficulty: "easy" },

        // --- Science: Medium ---
        { q: "What is the powerhouse of the cell?", a: "Mitochondria", fake: ["Nucleus", "Ribosome", "Golgi body"], domain: "science", difficulty: "medium" },
        { q: "What is the pH of pure water?", a: "7", fake: ["0", "14", "5"], domain: "science", difficulty: "medium" },
        { q: "What planet has the Great Red Spot?", a: "Jupiter", fake: ["Mars", "Saturn", "Neptune"], domain: "science", difficulty: "medium" },
        { q: "What is Newton's first law also known as?", a: "Law of Inertia", fake: ["Law of Gravity", "Law of Motion", "Law of Force"], domain: "science", difficulty: "medium" },
        { q: "What is the chemical formula for methane?", a: "CH₄", fake: ["CO₂", "C₂H₆", "NH₃"], domain: "science", difficulty: "medium" },
        { q: "What type of rock forms from cooled lava?", a: "Igneous", fake: ["Sedimentary", "Metamorphic", "Limestone"], domain: "science", difficulty: "medium" },
        { q: "What is the most abundant gas in Earth's atmosphere?", a: "Nitrogen", fake: ["Oxygen", "CO2", "Argon"], domain: "science", difficulty: "medium" },
        { q: "What scale measures earthquake magnitude?", a: "Richter Scale", fake: ["Beaufort Scale", "Mohs Scale", "Kelvin Scale"], domain: "science", difficulty: "medium" },
        { q: "What is the charge of an electron?", a: "Negative", fake: ["Positive", "Neutral", "Variable"], domain: "science", difficulty: "medium" },
        { q: "What is the unit of electrical resistance?", a: "Ohm", fake: ["Volt", "Ampere", "Watt"], domain: "science", difficulty: "medium" },
        { q: "Which vitamin is primarily obtained from sunlight?", a: "Vitamin D", fake: ["Vitamin C", "Vitamin A", "Vitamin K"], domain: "science", difficulty: "medium" },
        { q: "What is the lightest element?", a: "Hydrogen", fake: ["Helium", "Lithium", "Carbon"], domain: "science", difficulty: "medium" },
        { q: "How many chambers does the human heart have?", a: "4", fake: ["2", "3", "6"], domain: "science", difficulty: "medium" },
        { q: "What is the study of weather called?", a: "Meteorology", fake: ["Geology", "Astronomy", "Ecology"], domain: "science", difficulty: "medium" },
        { q: "What type of lens is used to correct nearsightedness?", a: "Concave", fake: ["Convex", "Bifocal", "Cylindrical"], domain: "science", difficulty: "medium" },
        { q: "Which noble gas is used in fluorescent lights?", a: "Neon", fake: ["Argon", "Krypton", "Xenon"], domain: "science", difficulty: "medium" },
        { q: "What particle carries a positive charge?", a: "Proton", fake: ["Electron", "Neutron", "Photon"], domain: "science", difficulty: "medium" },
        { q: "What is the atomic number of Carbon?", a: "6", fake: ["8", "12", "14"], domain: "science", difficulty: "medium" },
        { q: "What is the unit of frequency?", a: "Hertz", fake: ["Decibel", "Ohm", "Pascal"], domain: "science", difficulty: "medium" },
        { q: "What organ filters blood in the human body?", a: "Kidneys", fake: ["Liver", "Heart", "Spleen"], domain: "science", difficulty: "medium" },
        { q: "What planet is known for its rings?", a: "Saturn", fake: ["Jupiter", "Uranus", "Neptune"], domain: "science", difficulty: "medium" },
        { q: "What is the boiling point of water in Fahrenheit?", a: "212°F", fake: ["100°F", "180°F", "200°F"], domain: "science", difficulty: "medium" },
        { q: "What is the study of living organisms called?", a: "Biology", fake: ["Chemistry", "Physics", "Geology"], domain: "science", difficulty: "medium" },
        { q: "What is the chemical symbol for Sodium?", a: "Na", fake: ["So", "Sd", "S"], domain: "science", difficulty: "medium" },
        { q: "What phenomenon bends light as it passes through a prism?", a: "Dispersion", fake: ["Reflection", "Refraction", "Diffraction"], domain: "science", difficulty: "medium" },

        // --- Science: Hard ---
        { q: "What is the Heisenberg Uncertainty Principle about?", a: "Position & momentum", fake: ["Energy & mass", "Speed & time", "Force & distance"], domain: "science", difficulty: "hard" },
        { q: "What is the half-life of Carbon-14?", a: "~5,730 years", fake: ["~1,000 years", "~10,000 years", "~100 years"], domain: "science", difficulty: "hard" },
        { q: "What is the Chandrasekhar limit (approx)?", a: "1.4 solar masses", fake: ["2.5 solar masses", "0.5 solar masses", "5 solar masses"], domain: "science", difficulty: "hard" },
        { q: "What subatomic particle was discovered at CERN in 2012?", a: "Higgs Boson", fake: ["Graviton", "Tachyon", "Gluon"], domain: "science", difficulty: "hard" },
        { q: "What is the enzyme that unzips DNA?", a: "Helicase", fake: ["Polymerase", "Ligase", "Primase"], domain: "science", difficulty: "hard" },
        { q: "What is the Schwarzschild radius related to?", a: "Black holes", fake: ["Neutron stars", "White dwarfs", "Pulsars"], domain: "science", difficulty: "hard" },
        { q: "What is the second law of thermodynamics about?", a: "Entropy always increases", fake: ["Energy is conserved", "Force equals mass × acceleration", "Every action has a reaction"], domain: "science", difficulty: "hard" },
        { q: "What does the Drake Equation estimate?", a: "Intelligent civilizations in the galaxy", fake: ["Distance to stars", "Age of the universe", "Speed of light"], domain: "science", difficulty: "hard" },
        { q: "What is the Pauli Exclusion Principle?", a: "No two electrons share all quantum numbers", fake: ["Energy cannot be destroyed", "Mass and energy are equal", "Light is both wave and particle"], domain: "science", difficulty: "hard" },
        { q: "What type of bond shares electrons between atoms?", a: "Covalent", fake: ["Ionic", "Metallic", "Hydrogen"], domain: "science", difficulty: "hard" },
        { q: "What is the Krebs Cycle also known as?", a: "Citric Acid Cycle", fake: ["Calvin Cycle", "Electron Transport", "Glycolysis"], domain: "science", difficulty: "hard" },
        { q: "What is the most electronegative element?", a: "Fluorine", fake: ["Chlorine", "Oxygen", "Nitrogen"], domain: "science", difficulty: "hard" },
        { q: "What radiation has the shortest wavelength?", a: "Gamma rays", fake: ["X-rays", "Ultraviolet", "Infrared"], domain: "science", difficulty: "hard" },
        { q: "What is the SI unit of luminous intensity?", a: "Candela", fake: ["Lumen", "Lux", "Watt"], domain: "science", difficulty: "hard" },
        { q: "What is the Doppler Effect?", a: "Frequency change due to motion", fake: ["Light bending by gravity", "Sound amplification", "Wave interference"], domain: "science", difficulty: "hard" },
        { q: "What is a quark?", a: "A fundamental particle", fake: ["A type of star", "An energy unit", "A chemical bond"], domain: "science", difficulty: "hard" },
        { q: "What gas is produced during electrolysis of water at the anode?", a: "Oxygen", fake: ["Hydrogen", "Chlorine", "Nitrogen"], domain: "science", difficulty: "hard" },
        { q: "What is the triple point of water?", a: "0.01°C at 611.73 Pa", fake: ["0°C at 1 atm", "100°C at 1 atm", "25°C at 1 atm"], domain: "science", difficulty: "hard" },
        { q: "What is the photoelectric effect?", a: "Electrons ejected by light", fake: ["Light reflected by metal", "Current from heat", "Magnetism from light"], domain: "science", difficulty: "hard" },
        { q: "What is Avogadro's number (approx)?", a: "6.022 × 10²³", fake: ["3.14 × 10⁸", "9.8 × 10²", "1.6 × 10⁻¹⁹"], domain: "science", difficulty: "hard" },
        { q: "What is the most common isotope of Uranium used in reactors?", a: "U-235", fake: ["U-238", "U-233", "U-234"], domain: "science", difficulty: "hard" },
        { q: "What is the function of ribosomes?", a: "Protein synthesis", fake: ["Energy production", "DNA replication", "Cell division"], domain: "science", difficulty: "hard" },
        { q: "What is Planck's constant used for?", a: "Relating energy to frequency", fake: ["Measuring gravity", "Calculating speed", "Finding mass"], domain: "science", difficulty: "hard" },
        { q: "What is the study of fungi called?", a: "Mycology", fake: ["Virology", "Botany", "Zoology"], domain: "science", difficulty: "hard" },
        { q: "What is the Roche limit?", a: "Minimum distance before tidal forces disintegrate a body", fake: ["Maximum orbit speed", "Speed of light boundary", "Event horizon radius"], domain: "science", difficulty: "hard" },

        // ===================================================================
        //  DOMAIN: Tech / CS
        // ===================================================================
        // --- Tech: Easy ---
        { q: "What does 'CPU' stand for?", a: "Central Processing Unit", fake: ["Central Power Unit", "Computer Personal Unit", "Core Process Unit"], domain: "tech", difficulty: "easy" },
        { q: "What does 'URL' stand for?", a: "Uniform Resource Locator", fake: ["Universal Resource Link", "Uniform Remote Link", "Universal Record Locator"], domain: "tech", difficulty: "easy" },
        { q: "Which programming language is known as the 'snake'?", a: "Python", fake: ["Cobra", "Java", "Viper"], domain: "tech", difficulty: "easy" },
        { q: "What does HTTP stand for?", a: "HyperText Transfer Protocol", fake: ["HyperText Test Protocol", "HyperText Text Program", "High Transfer Protocol"], domain: "tech", difficulty: "easy" },
        { q: "Binary '10' equals what decimal number?", a: "2", fake: ["1", "3", "10"], domain: "tech", difficulty: "easy" },
        { q: "What key combination copies text?", a: "Ctrl + C", fake: ["Ctrl + V", "Ctrl + X", "Ctrl + Z"], domain: "tech", difficulty: "easy" },
        { q: "What does 'RAM' stand for?", a: "Random Access Memory", fake: ["Read Access Memory", "Run Active Memory", "Rapid Access Module"], domain: "tech", difficulty: "easy" },
        { q: "What company created the iPhone?", a: "Apple", fake: ["Samsung", "Google", "Microsoft"], domain: "tech", difficulty: "easy" },
        { q: "What does 'HTML' stand for?", a: "HyperText Markup Language", fake: ["High Text Machine Language", "HyperText Machine Logic", "Home Tool Markup Language"], domain: "tech", difficulty: "easy" },
        { q: "What is the main function of an operating system?", a: "Manage hardware and software", fake: ["Browse the internet", "Edit documents", "Play games"], domain: "tech", difficulty: "easy" },
        { q: "What does 'Wi-Fi' stand for?", a: "Wireless Fidelity", fake: ["Wired Fiber", "Wide Frequency", "Wireless Fiber"], domain: "tech", difficulty: "easy" },
        { q: "What is the brain of a computer?", a: "CPU", fake: ["RAM", "Hard Drive", "GPU"], domain: "tech", difficulty: "easy" },
        { q: "What does 'USB' stand for?", a: "Universal Serial Bus", fake: ["Ultra Speed Bus", "Universal System Base", "Unified Serial Board"], domain: "tech", difficulty: "easy" },
        { q: "What symbol is used for email addresses?", a: "@", fake: ["#", "&", "$"], domain: "tech", difficulty: "easy" },
        { q: "What is the shortcut to undo an action?", a: "Ctrl + Z", fake: ["Ctrl + Y", "Ctrl + U", "Ctrl + X"], domain: "tech", difficulty: "easy" },
        { q: "What does 'PDF' stand for?", a: "Portable Document Format", fake: ["Print Document File", "Personal Data Format", "Public Digital Format"], domain: "tech", difficulty: "easy" },
        { q: "What type of software is Google Chrome?", a: "Web Browser", fake: ["Text Editor", "Spreadsheet", "Email Client"], domain: "tech", difficulty: "easy" },
        { q: "What is the world's most used search engine?", a: "Google", fake: ["Bing", "Yahoo", "DuckDuckGo"], domain: "tech", difficulty: "easy" },
        { q: "What does 'GPS' stand for?", a: "Global Positioning System", fake: ["General Processing System", "Global Protocol Service", "Guided Position Signal"], domain: "tech", difficulty: "easy" },
        { q: "What is 1 byte equal to?", a: "8 bits", fake: ["4 bits", "16 bits", "2 bits"], domain: "tech", difficulty: "easy" },
        { q: "What file extension is used for images?", a: ".jpg", fake: [".exe", ".mp3", ".doc"], domain: "tech", difficulty: "easy" },
        { q: "What does 'SSD' stand for?", a: "Solid State Drive", fake: ["Super Speed Disk", "System Storage Device", "Serial Signal Drive"], domain: "tech", difficulty: "easy" },
        { q: "What language is used to style web pages?", a: "CSS", fake: ["HTML", "Python", "Java"], domain: "tech", difficulty: "easy" },
        { q: "What does 'AI' stand for?", a: "Artificial Intelligence", fake: ["Automated Interface", "Advanced Internet", "Analog Input"], domain: "tech", difficulty: "easy" },
        { q: "What is the file extension for Python scripts?", a: ".py", fake: [".pt", ".pn", ".px"], domain: "tech", difficulty: "easy" },

        // --- Tech: Medium ---
        { q: "Which logic gate outputs true only if both inputs are true?", a: "AND", fake: ["OR", "XOR", "NOT"], domain: "tech", difficulty: "medium" },
        { q: "What does 'API' stand for?", a: "Application Programming Interface", fake: ["Automated Process Integration", "Application Process Index", "Advanced Program Interface"], domain: "tech", difficulty: "medium" },
        { q: "What is 'localhost' typically mapped to?", a: "127.0.0.1", fake: ["192.168.0.1", "0.0.0.0", "10.0.0.1"], domain: "tech", difficulty: "medium" },
        { q: "What data structure uses FIFO?", a: "Queue", fake: ["Stack", "Tree", "Graph"], domain: "tech", difficulty: "medium" },
        { q: "What does 'SQL' stand for?", a: "Structured Query Language", fake: ["Simple Query Logic", "System Queue Language", "Standard Query Library"], domain: "tech", difficulty: "medium" },
        { q: "What is the time complexity of binary search?", a: "O(log n)", fake: ["O(n)", "O(n²)", "O(1)"], domain: "tech", difficulty: "medium" },
        { q: "What does 'JSON' stand for?", a: "JavaScript Object Notation", fake: ["Java System Output Name", "JavaScript Open Network", "Joint Syntax Object Naming"], domain: "tech", difficulty: "medium" },
        { q: "What port does HTTPS use by default?", a: "443", fake: ["80", "8080", "3000"], domain: "tech", difficulty: "medium" },
        { q: "What is a 'stack overflow'?", a: "Exceeding call stack memory", fake: ["Network overload", "Disk full error", "GPU crash"], domain: "tech", difficulty: "medium" },
        { q: "What does 'OOP' stand for?", a: "Object-Oriented Programming", fake: ["Open Online Protocol", "Optimal Operation Process", "Output-Oriented Programming"], domain: "tech", difficulty: "medium" },
        { q: "What is the default port for HTTP?", a: "80", fake: ["443", "8080", "3000"], domain: "tech", difficulty: "medium" },
        { q: "What sorting algorithm has average O(n log n)?", a: "Merge Sort", fake: ["Bubble Sort", "Selection Sort", "Insertion Sort"], domain: "tech", difficulty: "medium" },
        { q: "What does 'DNS' stand for?", a: "Domain Name System", fake: ["Digital Network Service", "Data Name Server", "Domain Node System"], domain: "tech", difficulty: "medium" },
        { q: "Which HTTP status code means 'Not Found'?", a: "404", fake: ["500", "200", "301"], domain: "tech", difficulty: "medium" },
        { q: "What does 'Git' primarily do?", a: "Version control", fake: ["File compression", "Code compilation", "Web hosting"], domain: "tech", difficulty: "medium" },
        { q: "What is the largest value a single byte can store?", a: "255", fake: ["256", "128", "512"], domain: "tech", difficulty: "medium" },
        { q: "What does 'SSH' stand for?", a: "Secure Shell", fake: ["Super Safe Host", "System Secure Hub", "Standard Socket Handler"], domain: "tech", difficulty: "medium" },
        { q: "What is a 'foreign key' in databases?", a: "A reference to a primary key in another table", fake: ["An encrypted password", "A temporary index", "A backup column"], domain: "tech", difficulty: "medium" },
        { q: "What language is Android primarily developed in?", a: "Kotlin/Java", fake: ["Swift", "C#", "Python"], domain: "tech", difficulty: "medium" },
        { q: "What does 'IDE' stand for?", a: "Integrated Development Environment", fake: ["Internet Data Exchange", "Internal Debug Engine", "Interactive Design Editor"], domain: "tech", difficulty: "medium" },
        { q: "What is the hexadecimal value of decimal 255?", a: "FF", fake: ["FE", "F0", "1F"], domain: "tech", difficulty: "medium" },
        { q: "What does 'CRUD' stand for in databases?", a: "Create, Read, Update, Delete", fake: ["Copy, Run, Upload, Download", "Connect, Request, Use, Drop", "Compile, Render, Upload, Debug"], domain: "tech", difficulty: "medium" },
        { q: "What does 'NoSQL' refer to?", a: "Non-relational databases", fake: ["No queries allowed", "No structure language", "Network-only SQL"], domain: "tech", difficulty: "medium" },
        { q: "What is 'TCP' in networking?", a: "Transmission Control Protocol", fake: ["Transfer Copy Protocol", "Total Connection Process", "Timed Control Packet"], domain: "tech", difficulty: "medium" },
        { q: "What does the 'C' in 'CSS' stand for?", a: "Cascading", fake: ["Computer", "Creative", "Central"], domain: "tech", difficulty: "medium" },

        // --- Tech: Hard ---
        { q: "What does Morse code represent '---' as?", a: "O", fake: ["S", "E", "T"], domain: "tech", difficulty: "hard" },
        { q: "What is a Turing Machine?", a: "A mathematical model of computation", fake: ["A type of CPU", "A quantum computer", "An AI algorithm"], domain: "tech", difficulty: "hard" },
        { q: "What is the CAP theorem about?", a: "Consistency, Availability, Partition tolerance tradeoffs", fake: ["CPU, ALU, Pipeline optimization", "Cache, Access, Performance metrics", "Control, Algorithm, Protocol design"], domain: "tech", difficulty: "hard" },
        { q: "What is 'Big O' notation used for?", a: "Describing algorithm efficiency", fake: ["Measuring memory usage", "Defining variable scope", "Counting code lines"], domain: "tech", difficulty: "hard" },
        { q: "What is the halting problem?", a: "Whether a program will finish or run forever", fake: ["How to stop infinite loops", "Why computers crash", "Memory leak detection"], domain: "tech", difficulty: "hard" },
        { q: "What is a 'race condition'?", a: "Outcome depends on timing of events", fake: ["A speed benchmark", "A CPU overclocking issue", "A type of sorting algorithm"], domain: "tech", difficulty: "hard" },
        { q: "What cipher does HTTPS primarily use?", a: "AES", fake: ["Caesar", "DES", "ROT13"], domain: "tech", difficulty: "hard" },
        { q: "What does 'ACID' stand for in databases?", a: "Atomicity, Consistency, Isolation, Durability", fake: ["Access, Control, Index, Data", "Add, Create, Insert, Delete", "Authenticate, Connect, Inspect, Debug"], domain: "tech", difficulty: "hard" },
        { q: "What is a 'deadlock' in OS?", a: "Processes waiting for each other indefinitely", fake: ["A crashed hard drive", "A corrupted file system", "A network timeout"], domain: "tech", difficulty: "hard" },
        { q: "What is 'sharding' in databases?", a: "Splitting data across multiple servers", fake: ["Encrypting data at rest", "Compressing table rows", "Backing up in real-time"], domain: "tech", difficulty: "hard" },
        { q: "What is the time complexity of quicksort (worst case)?", a: "O(n²)", fake: ["O(n log n)", "O(n)", "O(log n)"], domain: "tech", difficulty: "hard" },
        { q: "What does 'JWT' stand for?", a: "JSON Web Token", fake: ["Java Web Tool", "JavaScript Worker Thread", "Joint Web Transfer"], domain: "tech", difficulty: "hard" },
        { q: "What is a 'B-tree' optimized for?", a: "Disk read/write operations", fake: ["Sorting algorithms", "Graph traversal", "String matching"], domain: "tech", difficulty: "hard" },
        { q: "What is 'memoization'?", a: "Caching function results for reuse", fake: ["Freeing unused memory", "Writing to disk", "Compiling code ahead of time"], domain: "tech", difficulty: "hard" },
        { q: "What is the difference between TCP and UDP?", a: "TCP guarantees delivery, UDP doesn't", fake: ["TCP is faster", "UDP uses encryption", "TCP is wireless only"], domain: "tech", difficulty: "hard" },
        { q: "What is a 'closure' in programming?", a: "A function that captures its lexical scope", fake: ["A way to end a loop", "A type of class", "A database transaction"], domain: "tech", difficulty: "hard" },
        { q: "What is the P vs NP problem?", a: "Whether all verifiable problems are solvable quickly", fake: ["Power vs Network speed", "Process vs Node performance", "Parallel vs Normal processing"], domain: "tech", difficulty: "hard" },
        { q: "What is 'WebSocket' used for?", a: "Full-duplex communication over a single connection", fake: ["Serving static files", "Database queries", "File encryption"], domain: "tech", difficulty: "hard" },
        { q: "What is a 'hash collision'?", a: "Two inputs producing the same hash output", fake: ["A network conflict", "A memory leak", "A CPU bottleneck"], domain: "tech", difficulty: "hard" },
        { q: "What is 'Docker' used for?", a: "Containerizing applications", fake: ["Writing SQL queries", "Designing UI", "Version control"], domain: "tech", difficulty: "hard" },
        { q: "What does 'CORS' stand for?", a: "Cross-Origin Resource Sharing", fake: ["Central Operating Resource System", "Core Output Rendering Service", "Client-Origin Request Standard"], domain: "tech", difficulty: "hard" },
        { q: "What is 'polymorphism' in OOP?", a: "Objects taking many forms", fake: ["Multiple inheritance", "Code encryption", "Memory allocation"], domain: "tech", difficulty: "hard" },
        { q: "What is 'eventual consistency'?", a: "All nodes converge to the same state over time", fake: ["Instant sync across servers", "Data is always correct", "Transactions are atomic"], domain: "tech", difficulty: "hard" },
        { q: "What is a 'semaphore' in OS?", a: "A signaling mechanism for process sync", fake: ["A type of file lock", "A memory page", "A CPU register"], domain: "tech", difficulty: "hard" },
        { q: "What is 'garbage collection'?", a: "Automatic memory reclamation", fake: ["Deleting old files", "Clearing browser cache", "Defragmenting disks"], domain: "tech", difficulty: "hard" },

        // ===================================================================
        //  DOMAIN: History & Geography
        // ===================================================================
        // --- History: Easy ---
        { q: "What year did World War II end?", a: "1945", fake: ["1939", "1918", "1963"], domain: "history", difficulty: "easy" },
        { q: "Which continent is the Sahara Desert in?", a: "Africa", fake: ["Asia", "America", "Australia"], domain: "history", difficulty: "easy" },
        { q: "What is the capital of Japan?", a: "Tokyo", fake: ["Beijing", "Seoul", "Bangkok"], domain: "history", difficulty: "easy" },
        { q: "Who was the first person to walk on the Moon?", a: "Neil Armstrong", fake: ["Buzz Aldrin", "Yuri Gagarin", "John Glenn"], domain: "history", difficulty: "easy" },
        { q: "What is the capital of Australia?", a: "Canberra", fake: ["Sydney", "Melbourne", "Brisbane"], domain: "history", difficulty: "easy" },
        { q: "Which ocean is between Europe and America?", a: "Atlantic", fake: ["Pacific", "Indian", "Arctic"], domain: "history", difficulty: "easy" },
        { q: "What is the capital of Italy?", a: "Rome", fake: ["Milan", "Venice", "Florence"], domain: "history", difficulty: "easy" },
        { q: "Who built the pyramids?", a: "Ancient Egyptians", fake: ["Romans", "Greeks", "Persians"], domain: "history", difficulty: "easy" },
        { q: "What is the largest country by area?", a: "Russia", fake: ["Canada", "China", "USA"], domain: "history", difficulty: "easy" },
        { q: "What is the capital of Germany?", a: "Berlin", fake: ["Munich", "Frankfurt", "Hamburg"], domain: "history", difficulty: "easy" },
        { q: "What language is spoken in Brazil?", a: "Portuguese", fake: ["Spanish", "English", "French"], domain: "history", difficulty: "easy" },
        { q: "Which country has the Great Wall?", a: "China", fake: ["Japan", "India", "Korea"], domain: "history", difficulty: "easy" },
        { q: "What is the capital of Canada?", a: "Ottawa", fake: ["Toronto", "Vancouver", "Montreal"], domain: "history", difficulty: "easy" },
        { q: "On which continent is Brazil?", a: "South America", fake: ["Europe", "Africa", "North America"], domain: "history", difficulty: "easy" },
        { q: "What is the capital of Spain?", a: "Madrid", fake: ["Barcelona", "Seville", "Valencia"], domain: "history", difficulty: "easy" },
        { q: "Who was the first US president?", a: "George Washington", fake: ["Lincoln", "Jefferson", "Adams"], domain: "history", difficulty: "easy" },
        { q: "What country is the Eiffel Tower in?", a: "France", fake: ["Italy", "Spain", "UK"], domain: "history", difficulty: "easy" },
        { q: "What is the capital of India?", a: "New Delhi", fake: ["Mumbai", "Kolkata", "Chennai"], domain: "history", difficulty: "easy" },
        { q: "Which river flows through Egypt?", a: "Nile", fake: ["Amazon", "Ganges", "Danube"], domain: "history", difficulty: "easy" },
        { q: "What year did the Titanic sink?", a: "1912", fake: ["1905", "1920", "1898"], domain: "history", difficulty: "easy" },
        { q: "What is the capital of South Korea?", a: "Seoul", fake: ["Tokyo", "Beijing", "Taipei"], domain: "history", difficulty: "easy" },
        { q: "Which country is famous for kangaroos?", a: "Australia", fake: ["India", "Brazil", "Kenya"], domain: "history", difficulty: "easy" },
        { q: "What is the capital of Egypt?", a: "Cairo", fake: ["Alexandria", "Luxor", "Giza"], domain: "history", difficulty: "easy" },
        { q: "Which ocean is the largest?", a: "Pacific", fake: ["Atlantic", "Indian", "Southern"], domain: "history", difficulty: "easy" },
        { q: "What country is shaped like a boot?", a: "Italy", fake: ["Greece", "Spain", "France"], domain: "history", difficulty: "easy" },

        // --- History: Medium ---
        { q: "What year did World War I begin?", a: "1914", fake: ["1918", "1939", "1905"], domain: "history", difficulty: "medium" },
        { q: "Who was the leader of Nazi Germany?", a: "Adolf Hitler", fake: ["Mussolini", "Stalin", "Franco"], domain: "history", difficulty: "medium" },
        { q: "What was the Berlin Wall?", a: "A barrier dividing East and West Berlin", fake: ["A medieval fortress", "A Roman aqueduct", "A trade route"], domain: "history", difficulty: "medium" },
        { q: "In what year did India gain independence?", a: "1947", fake: ["1950", "1942", "1935"], domain: "history", difficulty: "medium" },
        { q: "Who was Cleopatra?", a: "The last pharaoh of Ancient Egypt", fake: ["A Greek goddess", "A Roman empress", "A Persian queen"], domain: "history", difficulty: "medium" },
        { q: "What empire was ruled by Genghis Khan?", a: "Mongol Empire", fake: ["Ottoman Empire", "Roman Empire", "Persian Empire"], domain: "history", difficulty: "medium" },
        { q: "What was the Renaissance?", a: "A cultural rebirth in Europe", fake: ["A war in Asia", "A scientific law", "A religious movement"], domain: "history", difficulty: "medium" },
        { q: "In what year did the French Revolution begin?", a: "1789", fake: ["1776", "1804", "1812"], domain: "history", difficulty: "medium" },
        { q: "Which city was the capital of the Byzantine Empire?", a: "Constantinople", fake: ["Rome", "Athens", "Alexandria"], domain: "history", difficulty: "medium" },
        { q: "What document was signed in 1215 in England?", a: "Magna Carta", fake: ["Bill of Rights", "Declaration of Independence", "Treaty of Versailles"], domain: "history", difficulty: "medium" },
        { q: "Who discovered America in 1492?", a: "Christopher Columbus", fake: ["Vasco da Gama", "Magellan", "Leif Erikson"], domain: "history", difficulty: "medium" },
        { q: "What was the Cold War?", a: "A political rivalry between USA and USSR", fake: ["A war in Antarctica", "A trade embargo on oil", "A space weather event"], domain: "history", difficulty: "medium" },
        { q: "What country was formerly known as Persia?", a: "Iran", fake: ["Iraq", "Turkey", "Afghanistan"], domain: "history", difficulty: "medium" },
        { q: "What is the smallest continent?", a: "Australia", fake: ["Europe", "Antarctica", "South America"], domain: "history", difficulty: "medium" },
        { q: "What strait separates Europe from Africa?", a: "Strait of Gibraltar", fake: ["Bosphorus", "Strait of Hormuz", "English Channel"], domain: "history", difficulty: "medium" },
        { q: "Who was the first Emperor of Rome?", a: "Augustus", fake: ["Julius Caesar", "Nero", "Caligula"], domain: "history", difficulty: "medium" },
        { q: "What year did the Berlin Wall fall?", a: "1989", fake: ["1991", "1985", "1979"], domain: "history", difficulty: "medium" },
        { q: "Which country colonized India?", a: "Britain", fake: ["France", "Portugal", "Netherlands"], domain: "history", difficulty: "medium" },
        { q: "What is the capital of Turkey?", a: "Ankara", fake: ["Istanbul", "Izmir", "Antalya"], domain: "history", difficulty: "medium" },
        { q: "Who led the Indian independence movement?", a: "Mahatma Gandhi", fake: ["Nehru", "Subhas Bose", "Bhagat Singh"], domain: "history", difficulty: "medium" },
        { q: "What was the Manhattan Project?", a: "The development of the atomic bomb", fake: ["A space mission", "A trade agreement", "A spy network"], domain: "history", difficulty: "medium" },
        { q: "In which city were the first modern Olympics held?", a: "Athens", fake: ["Paris", "London", "Rome"], domain: "history", difficulty: "medium" },
        { q: "What year did the USSR dissolve?", a: "1991", fake: ["1989", "1985", "1995"], domain: "history", difficulty: "medium" },
        { q: "What is the capital of Brazil?", a: "Brasília", fake: ["São Paulo", "Rio de Janeiro", "Salvador"], domain: "history", difficulty: "medium" },
        { q: "Who was the first female Prime Minister of the UK?", a: "Margaret Thatcher", fake: ["Theresa May", "Queen Victoria", "Elizabeth II"], domain: "history", difficulty: "medium" },

        // --- History: Hard ---
        { q: "What year was the Treaty of Westphalia signed?", a: "1648", fake: ["1555", "1776", "1815"], domain: "history", difficulty: "hard" },
        { q: "Who was the last Tsar of Russia?", a: "Nicholas II", fake: ["Alexander III", "Peter the Great", "Ivan IV"], domain: "history", difficulty: "hard" },
        { q: "What was the Sykes-Picot Agreement about?", a: "Dividing the Ottoman Empire's Arab provinces", fake: ["Ending WWI", "Forming NATO", "Unifying Germany"], domain: "history", difficulty: "hard" },
        { q: "What dynasty ruled China the longest?", a: "Zhou Dynasty", fake: ["Ming Dynasty", "Qing Dynasty", "Han Dynasty"], domain: "history", difficulty: "hard" },
        { q: "Who was Hannibal Barca?", a: "A Carthaginian military commander", fake: ["A Roman emperor", "A Greek philosopher", "An Egyptian pharaoh"], domain: "history", difficulty: "hard" },
        { q: "What was the Scramble for Africa?", a: "European colonization of Africa in the late 1800s", fake: ["A gold rush", "A famine relief effort", "A religious crusade"], domain: "history", difficulty: "hard" },
        { q: "In what year did the Ottoman Empire fall?", a: "1922", fake: ["1918", "1900", "1945"], domain: "history", difficulty: "hard" },
        { q: "What is the Rosetta Stone?", a: "A stone with text in three scripts aiding Egyptian decipherment", fake: ["A type of meteor", "A Roman law tablet", "A Greek compass"], domain: "history", difficulty: "hard" },
        { q: "Who wrote 'The Art of War'?", a: "Sun Tzu", fake: ["Confucius", "Lao Tzu", "Genghis Khan"], domain: "history", difficulty: "hard" },
        { q: "What was the Silk Road?", a: "An ancient trade route connecting East and West", fake: ["A Chinese invention", "A type of fabric", "A Roman highway"], domain: "history", difficulty: "hard" },
        { q: "What year was the Magna Carta originally issued?", a: "1215", fake: ["1066", "1315", "1492"], domain: "history", difficulty: "hard" },
        { q: "What was the Congress of Vienna (1814-15)?", a: "A conference to reshape Europe after Napoleon", fake: ["A scientific congress", "A religious council", "A colonial trade meeting"], domain: "history", difficulty: "hard" },
        { q: "Who was the first female pharaoh of Egypt?", a: "Hatshepsut", fake: ["Cleopatra", "Nefertiti", "Isis"], domain: "history", difficulty: "hard" },
        { q: "What is the deepest lake in the world?", a: "Lake Baikal", fake: ["Lake Superior", "Caspian Sea", "Lake Victoria"], domain: "history", difficulty: "hard" },
        { q: "What year was the Suez Canal opened?", a: "1869", fake: ["1914", "1850", "1900"], domain: "history", difficulty: "hard" },
        { q: "What civilization built Machu Picchu?", a: "Inca", fake: ["Maya", "Aztec", "Olmec"], domain: "history", difficulty: "hard" },
        { q: "Who was the first person to circumnavigate the globe?", a: "Ferdinand Magellan's expedition", fake: ["Columbus", "Cook", "Drake"], domain: "history", difficulty: "hard" },
        { q: "What was the Dreyfus Affair?", a: "A French political scandal about wrongful treason charges", fake: ["A British spy case", "An American trade scandal", "A German military coup"], domain: "history", difficulty: "hard" },
        { q: "What ancient city was buried by Mount Vesuvius?", a: "Pompeii", fake: ["Troy", "Carthage", "Babylon"], domain: "history", difficulty: "hard" },
        { q: "What is the Line of Control?", a: "The de facto border between India and Pakistan in Kashmir", fake: ["The Equator", "The US-Mexico border", "The DMZ in Korea"], domain: "history", difficulty: "hard" },
        { q: "What was the Meiji Restoration?", a: "The modernization of Japan in the late 1800s", fake: ["A Chinese dynasty change", "A Korean revolution", "An Indian reform movement"], domain: "history", difficulty: "hard" },
        { q: "What is the oldest known civilization?", a: "Sumer (Mesopotamia)", fake: ["Egypt", "Indus Valley", "China"], domain: "history", difficulty: "hard" },
        { q: "What was the Marshall Plan?", a: "US aid to rebuild Europe after WWII", fake: ["A military alliance", "A space program", "A nuclear treaty"], domain: "history", difficulty: "hard" },
        { q: "What is the Tropic of Cancer?", a: "A latitude line at 23.5°N", fake: ["The equator", "A longitude line", "A temperature zone"], domain: "history", difficulty: "hard" },
        { q: "What was the Balfour Declaration?", a: "British support for a Jewish homeland in Palestine", fake: ["French surrender in WWII", "US declaration of war", "Russian peace treaty"], domain: "history", difficulty: "hard" }
    ],

    // 3. DOMAINS LIST (for UI)
    domains: [
        { id: 'all', label: 'All Topics' },
        { id: 'gk', label: 'General Knowledge' },
        { id: 'science', label: 'Science' },
        { id: 'tech', label: 'Tech / CS' },
        { id: 'history', label: 'History & Geography' }
    ],

    // 4. FILTERED RETRIEVAL
    getFilteredBank: function(difficulty, domain) {
        let pool = this.questionBank;
        if (difficulty && difficulty !== 'all') {
            pool = pool.filter(q => q.difficulty === difficulty);
        }
        if (domain && domain !== 'all') {
            pool = pool.filter(q => q.domain === domain);
        }
        return pool;
    },

    // 5. THE SHUFFLER ENGINE
    getNewRound: function(difficulty, domain) {
        const pool = this.getFilteredBank(difficulty, domain);
        if (pool.length === 0) return null;

        const randomQ = pool[Math.floor(Math.random() * pool.length)];

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