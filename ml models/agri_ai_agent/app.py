import streamlit as st
from core.llm_engine import LLMEngine
from core.agent import AgriAgent

st.set_page_config(page_title="Agri AI Agent", page_icon="🌾")

st.title("🌾 Agri AI Agent")
st.write("Ask any agriculture-related question.")

@st.cache_resource
def load_agent():
    llm = LLMEngine()
    agent = AgriAgent(llm)
    return agent

agent = load_agent()

st.markdown("---")
user_query = st.text_area(
    "Enter your agricultural question:",
    placeholder="e.g., How do I control aphids in wheat crop?",
    height=100
)

col1, col2 = st.columns([1, 1])

with col1:
    if st.button("🚀 Get Answer", use_container_width=True):
        if user_query.strip() == "":
            st.warning("Please enter a question.")
        else:
            with st.spinner("Generating detailed answer..."):
                response = agent.answer(user_query)
            
            st.success("Answer received!")
            st.markdown("### 📋 Expert Answer:")
            st.markdown(response)

with col2:
    if st.button("🔄 Clear", use_container_width=True):
        st.rerun()

st.markdown("---")
st.subheader("📚 Example Questions")
examples = [
    "How do I control aphids in wheat crop?",
    "What are the best practices for soil fertility?",
    "How to improve crop yield in rainy season?",
    "What is the best irrigation method for vegetables?"
]

for i, example in enumerate(examples):
    if st.button(f"📌 {example}", key=f"example_{i}"):
        with st.spinner("Generating answer..."):
            response = agent.answer(example)
        st.markdown("### 📋 Expert Answer:")
        st.markdown(response)

