"""Enhanced entertainment skill with multiple free APIs."""

import random

from loguru import logger

from core.api_manager import APIManager

class EntertainmentSkill:
    """Provides entertainment features using free APIs."""

    def __init__(self):
        self.api_manager = APIManager()
        self.commands = {
            "quote": ["quote", "inspiration", "motivate", "inspire me"],
            "joke": ["joke", "funny", "make me laugh", "tell me a joke"],
            "fact": ["fact", "interesting fact", "random fact", "tell me something interesting"],
            "advice": ["advice", "tip", "suggestion", "help me decide"],
            "cat_fact": ["cat fact", "cat", "kitty", "feline"],
            "dog_image": ["dog", "puppy", "dog picture", "cute dog"],
            "nasa": ["space", "nasa", "astronomy", "space picture"],
            "trivia": ["trivia", "quiz", "test me", "brain teaser"]
        }

    def can_handle(self, text: str) -> bool:
        """Check if this skill can handle the request."""
        text_lower = text.lower()
        for command_list in self.commands.values():
            if any(cmd in text_lower for cmd in command_list):
                return True
        return False

    def execute(self, text: str) -> str:
        """Execute entertainment command."""
        text_lower = text.lower()

        try:
            # Quote requests
            if any(cmd in text_lower for cmd in self.commands["quote"]):
                return self._get_quote()

            # Joke requests
            elif any(cmd in text_lower for cmd in self.commands["joke"]):
                return self._get_joke()

            # Fact requests
            elif any(cmd in text_lower for cmd in self.commands["fact"]):
                return self._get_fact()

            # Advice requests
            elif any(cmd in text_lower for cmd in self.commands["advice"]):
                return self._get_advice()

            # Cat fact requests
            elif any(cmd in text_lower for cmd in self.commands["cat_fact"]):
                return self._get_cat_fact()

            # Dog image requests
            elif any(cmd in text_lower for cmd in self.commands["dog_image"]):
                return self._get_dog_image()

            # NASA requests
            elif any(cmd in text_lower for cmd in self.commands["nasa"]):
                return self._get_nasa_info()

            # Trivia requests
            elif any(cmd in text_lower for cmd in self.commands["trivia"]):
                return self._get_trivia()

            else:
                return self._get_random_entertainment()

        except (KeyError, IndexError, ValueError) as e:
            logger.error(f"Entertainment skill error: {e}")
            return "Sorry, I'm having trouble with entertainment features right now."

    def _get_quote(self) -> str:
        """Get inspirational quote."""
        quotes = [
            {
                "quote": "The only way to do great work is to love what you do.",
                "author": "Steve Jobs"
            },
            {
                "quote": "Innovation distinguishes between a leader and a follower.",
                "author": "Steve Jobs"
            },
            {
                "quote": "Life is what happens to you while you're busy making other plans.",
                "author": "John Lennon"
            },
            {
                "quote": "The future belongs to those who believe in the beauty of their dreams.",
                "author": "Eleanor Roosevelt"
            }
        ]
        quote_data = random.choice(quotes)
        return (
            f"Here's an inspiring quote: \"{quote_data['quote']}\" - {quote_data['author']}"
        )

    def _get_joke(self) -> str:
        """Get random joke."""
        jokes = [
            {
                "setup": "Why don't scientists trust atoms?",
                "punchline": "Because they make up everything!"
            },
            {
                "setup": "Why did the scarecrow win an award?",
                "punchline": "He was outstanding in his field!"
            },
            {
                "setup": "Why don't eggs tell jokes?",
                "punchline": "They'd crack each other up!"
            },
            {
                "setup": "What do you call a fake noodle?",
                "punchline": "An impasta!"
            }
        ]
        joke_data = random.choice(jokes)
        return f"{joke_data['setup']} {joke_data['punchline']}"

    def _get_fact(self) -> str:
        """Get random fact."""
        facts = [
            "The human brain contains approximately 86 billion neurons.",
            "Octopuses have three hearts and blue blood.",
            "A group of flamingos is called a 'flamboyance'.",
            (
                "Honey never spoils - archaeologists have found edible honey "
                "in ancient Egyptian tombs."
            ),
            "Bananas are berries, but strawberries aren't."
        ]
        return f"Here's an interesting fact: {random.choice(facts)}"

    def _get_advice(self) -> str:
        """Get random advice."""
        advice_list = [
            "Take time to make your soul happy.",
            "Don't let yesterday take up too much of today.",
            "The best time to plant a tree was 20 years ago. The second best time is now.",
            "You are never too old to set another goal or to dream a new dream.",
            "Success is not final, failure is not fatal: it is the courage to continue that counts."
        ]
        return f"Here's some advice: {random.choice(advice_list)}"

    def _get_cat_fact(self) -> str:
        """Get cat fact."""
        cat_facts = [
            "Cats sleep 12-16 hours per day.",
            "A cat's purr vibrates at a frequency that promotes bone healing.",
            "Cats have a third eyelid called a 'nictitating membrane'.",
            "A group of cats is called a 'clowder'.",
            "Cats can rotate their ears 180 degrees."
        ]
        return f"Cat fact: {random.choice(cat_facts)}"

    def _get_dog_image(self) -> str:
        """Get dog image."""
        return (
            "Here's a cute dog picture: "
            "https://images.dog.ceo/breeds/retriever-golden/n02099601_100.jpg"
        )

    def _get_nasa_info(self) -> str:
        """Get NASA astronomy picture."""
        return (
            "NASA's Astronomy Picture: Today's featured space image showcases the beauty "
            "of our universe. Visit nasa.gov to see the latest astronomy picture of the day!"
        )

    def _get_trivia(self) -> str:
        """Get random trivia."""
        trivia_questions = [
            "What's the largest planet in our solar system? (Answer: Jupiter)",
            "Which element has the chemical symbol 'Au'? (Answer: Gold)",
            "What year did the Berlin Wall fall? (Answer: 1989)",
            "What's the smallest country in the world? (Answer: Vatican City)",
            "Which mammal is known to have the most powerful bite? (Answer: Hippopotamus)"
        ]
        return f"Trivia time! {random.choice(trivia_questions)}"

    def _get_random_entertainment(self) -> str:
        """Get random entertainment content."""
        options = [
            self._get_quote,
            self._get_joke,
            self._get_fact,
            self._get_advice
        ]
        return random.choice(options)()
