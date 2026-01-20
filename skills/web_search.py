from duckduckgo_search import DDGS
import signal


def search_web(query: str) -> str:
    """Search web using DuckDuckGo and return formatted results."""
    
    def timeout_handler(signum, frame):
        raise TimeoutError("Search timeout")
    
    try:
        # Set 5-second timeout
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(5)
        
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
        
        signal.alarm(0)  # Cancel timeout
        
        if not results:
            return "I couldn't find reliable results right now."
        
        formatted = "Here's what I found:\n"
        for i, result in enumerate(results, 1):
            title = result.get('title', 'No title')
            snippet = result.get('body', 'No description')
            formatted += f"{i}) {title} – {snippet}\n"
        
        return formatted.strip()
    
    except (TimeoutError, Exception):
        signal.alarm(0)  # Ensure timeout is cancelled
        return "I couldn't find reliable results right now."