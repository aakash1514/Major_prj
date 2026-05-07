# core/llm_engine.py

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

class LLMEngine:

    def __init__(self, model_name="google/flan-t5-small"):
        print("Loading model...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        print("Model loaded successfully!")

    def generate(self, prompt, max_length=512, min_length=100):

        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True
        )

        outputs = self.model.generate(
            **inputs,
            max_length=max_length,
            min_length=min_length,
            num_beams=5,
            early_stopping=True,
            temperature=0.5,
            top_p=0.85,
            do_sample=False,
            no_repeat_ngram_size=3,
            length_penalty=1.2
        )

        response = self.tokenizer.decode(
            outputs[0],
            skip_special_tokens=True
        )

        return response
