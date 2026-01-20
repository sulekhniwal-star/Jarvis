from core.gemini_llm import GeminiLLM
from core.self_coder import SelfCoder
from skills.web_search import search_web
from skills.system_control import open_app
import re


class AgentMode:
    def __init__(self, tts, memory, persistent_memory):
        self.llm = GeminiLLM()
        self.self_coder = SelfCoder()
        self.tts = tts
        self.memory = memory
        self.persistent_memory = persistent_memory
    
    def run_task(self, goal: str):
        """Execute a multi-step task to achieve the given goal."""
        try:
            # Get task breakdown from Gemini
            breakdown_prompt = f"Break down this goal into 3-5 numbered steps: {goal}"
            steps_text = self.llm.generate_reply(breakdown_prompt, "")
            
            # Extract numbered steps
            steps = re.findall(r'\d+[.)]\s*(.+)', steps_text)
            
            if not steps:
                self.tts.speak("I couldn't break down the task properly.")
                return
            
            self.tts.speak(f"I'll complete this task in {len(steps)} steps.")
            
            results = []
            
            # Execute each step
            for i, step in enumerate(steps, 1):
                self.tts.speak(f"Step {i}: {step}")
                
                # Decide which tool to use
                step_lower = step.lower()
                
                if any(word in step_lower for word in ["search", "find", "look up", "research"]):
                    result = search_web(step)
                elif any(word in step_lower for word in ["open", "launch", "start", "run"]):
                    result = open_app(step)
                elif any(word in step_lower for word in ["code", "program", "script", "write"]):
                    result = self.self_coder.generate_code(step)
                else:
                    # Use Gemini for general tasks
                    result = self.llm.generate_reply(step, "")
                
                results.append(f"Step {i}: {result}")
                self.memory.add(f"Agent Step {i}", result)
                self.persistent_memory.save(f"Agent Step {i}", result)
                
                self.tts.speak("Step completed.")
            
            # Final summary
            summary = f"Task completed successfully. I executed {len(steps)} steps to achieve: {goal}"
            self.tts.speak(summary)
            self.memory.add("Agent Task", summary)
            self.persistent_memory.save("Agent Task", summary)
            
        except Exception as e:
            self.tts.speak("I encountered an error while executing the task.")