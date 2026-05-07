from llm_engine import LLMEngine

llm = LLMEngine()

prompt = "Explain how to improve soil fertility."

print(llm.generate(prompt))
