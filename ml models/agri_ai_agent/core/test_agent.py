from llm_engine import LLMEngine
from agent import AgriAgent

llm = LLMEngine()
agent = AgriAgent(llm)

question = "How to control aphids in wheat crop?"

response = agent.answer(question)

print(response)
