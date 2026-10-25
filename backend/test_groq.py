import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    print("ERROR: GROQ_API_KEY not found in .env")
else:
    try:
        client = Groq(api_key=api_key)

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "user",
                    "content": "Generate 3 interview questions for a Python developer. Keep the answer short."
                }
            ],
            temperature=0.7,
            max_tokens=300
        )

        print("\nGroq API connected successfully!\n")
        print(response.choices[0].message.content)

    except Exception as e:
        print("API Error:", str(e))