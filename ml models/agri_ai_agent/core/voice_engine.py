# core/voice_engine.py

import speech_recognition as sr
import pyttsx3

class VoiceEngine:

    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.tts_engine = pyttsx3.init()

    def listen(self):
        try:
            with sr.Microphone() as source:
                print("Listening...")
                audio = self.recognizer.listen(source, timeout=10)

            try:
                text = self.recognizer.recognize_google(audio)
                return text
            except sr.UnknownValueError:
                print("Could not understand audio")
                return None
            except sr.RequestError as e:
                print(f"Error with speech recognition service: {e}")
                return None
        except Exception as e:
            print(f"Microphone error: {e}")
            return None

    def speak(self, text):
        self.tts_engine.say(text)
        self.tts_engine.runAndWait()
