import os
from pathlib import Path

def greet(name: str) -> str:
    if not name:
        return "Hello, World!"
    return f"Hello, {name}!"

class Calculator:
    def __init__(self):
        self.history = []

    def add(self, a: int, b: int) -> int:
        result = a + b
        self.history.append(result)
        return result

    def get_history(self):
        return self.history

for i in range(10):
    print(greet(str(i)))
