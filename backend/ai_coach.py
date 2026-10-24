"""
StudyPilot AI - AI Study Coach Backend Service
Provides intelligent study coaching, beginner-level concept explanations,
practice question generation, and revision strategies.
Uses Google Gemini API when GEMINI_API_KEY is available, with an intelligent
offline educational fallback engine. Transparently labels provider source.
"""

import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List

SYSTEM_PROMPT = """You are StudyPilot AI's friendly, encouraging, and pedagogically expert College Study Coach.
Your primary goals:
1. Explain technical and academic concepts clearly at a beginner to intermediate college level using concrete analogies, code snippets, or intuitive examples.
2. Formulate practical revision strategies (Active Recall, Feynman Technique, Spaced Repetition, Pomodoro pacing).
3. Generate high-yield practice questions with detailed explanations when requested.
4. Help students overcome procrastination and break daunting assignments into 25-45 minute focus sessions.
5. Keep explanations structured with markdown bullet points, bold key terms, and concise summaries.
"""

# Rich offline knowledge base for core college student subjects
OFFLINE_TOPIC_KNOWLEDGE = {
    "tree": {
        "title": "Binary Search Trees (BST) & Balanced Trees",
        "concept": "A **Binary Search Tree (BST)** is a hierarchical data structure where each node has at most two children. The core rule is: **Left < Root < Right**.\n\n"
                   "- **Search & Insert Average Time Complexity**: $O(\\log n)$ when balanced.\n"
                   "- **Worst-case Time Complexity**: $O(n)$ if inserted in sorted order (becomes a skewed linked list).\n"
                   "- **Self-Balancing Trees (AVL, Red-Black)**: Automatically perform rotations (Left/Right) to maintain tree height at $O(\\log n)$.",
        "practice": [
            "**Q1:** If you insert values [50, 30, 70, 20, 40] in order into an empty BST, what is the in-order traversal?\n*Answer:* In-order traversal of any BST always produces sorted order: [20, 30, 40, 50, 70].",
            "**Q2:** Why does a Red-Black tree use colors instead of strict height balancing like AVL?\n*Answer:* Red-Black trees require fewer rotations during frequent insertions and deletions, making them faster for real-world write-heavy workloads (e.g., Java's `TreeMap`)."
        ],
        "strategy": "1. Sketch tree rotations on physical paper before coding.\n2. Implement `insert` and `inorderTraversal` recursively first, then iteratively."
    },
    "graph": {
        "title": "Graph Traversals: BFS vs DFS",
        "concept": "Graphs consist of **Vertices (Nodes)** and **Edges (Connections)**.\n\n"
                   "- **Breadth-First Search (BFS)**: Uses a **Queue (FIFO)**. Explores all neighbors at current depth before going deeper. Ideal for finding the **shortest path** on unweighted graphs.\n"
                   "- **Depth-First Search (DFS)**: Uses a **Stack (LIFO)** or recursion. Explores as far as possible down each branch before backtracking. Ideal for topological sorting, cycle detection, and maze solving.\n"
                   "- **Time Complexity**: $O(V + E)$ where $V$ = vertices and $E$ = edges.",
        "practice": [
            "**Q1:** Which traversal guarantees the shortest path between two vertices in an unweighted graph?\n*Answer:* BFS, because it explores in increasing radius of edge distance.",
            "**Q2:** How do you prevent infinite loops during traversal in a cyclic graph?\n*Answer:* Maintain a `visited` set or boolean array and check it before enqueuing/visiting each node."
        ],
        "strategy": "Practice template code for BFS using `ArrayDeque` in Java and DFS with a recursive helper."
    },
    "java": {
        "title": "Java Object-Oriented Programming (OOP) Principles",
        "concept": "Java's 4 Core OOP Pillars:\n\n"
                   "1. **Encapsulation**: Bundling data (private variables) with methods that operate on them, using getters/setters for controlled access.\n"
                   "2. **Inheritance**: Creating child classes that inherit fields and methods from a parent class via `extends`.\n"
                   "3. **Polymorphism**: 'Many forms'. Compile-time (Method Overloading) vs Runtime (Method Overriding with `@Override`).\n"
                   "4. **Abstraction**: Hiding internal implementation details using `interface` and `abstract class`.",
        "practice": [
            "**Q1:** What is the difference between an `Interface` and an `Abstract Class` in modern Java?\n*Answer:* An abstract class can have instance state (fields) and constructors, whereas interfaces cannot maintain mutable instance state, but can have default and static methods.",
            "**Q2:** Why does Java prefer composition over deep inheritance hierarchies?\n*Answer:* Composition reduces tight coupling and prevents fragile base class issues when superclasses change."
        ],
        "strategy": "Write a mini-project (e.g. Bank Account or Library Management) combining all 4 principles in 45 minutes."
    },
    "math": {
        "title": "Discrete Mathematics: Proof by Induction & Relations",
        "concept": "Mathematical Induction works like dominoes in two fundamental steps:\n\n"
                   "1. **Base Case**: Prove statement $P(n)$ is true for the smallest valid integer (typically $n=1$ or $n=0$).\n"
                   "2. **Inductive Hypothesis**: Assume statement $P(k)$ is true for an arbitrary integer $k$.\n"
                   "3. **Inductive Step**: Using $P(k)$, prove that $P(k+1)$ must also be true. Conclude $P(n)$ holds for all $n$.\n\n"
                   "**Equivalence Relations**: A relation $R$ on set $A$ is an equivalence relation if and only if it is **Reflexive** ($aRa$), **Symmetric** ($aRb \\implies bRa$), and **Transitive** ($aRb \\land bRc \\implies aRc$).",
        "practice": [
            "**Q1:** Prove $\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$ using induction.\n*Answer:* Base case $n=1$: $1 = 1(2)/2 = 1$ (True). Inductive step: Add $(k+1)$ to $\\frac{k(k+1)}{2} = \\frac{k(k+1) + 2(k+1)}{2} = \\frac{(k+1)(k+2)}{2}$. Q.E.D.",
            "**Q2:** Is the '<' relation on integers an equivalence relation?\n*Answer:* No. It is neither reflexive ($x < x$ is false) nor symmetric."
        ],
        "strategy": "State your Inductive Hypothesis clearly in words before doing algebraic manipulation."
    },
    "strategy": {
        "title": "High-Yield College Study Techniques",
        "concept": "**Cognitive Science-Backed Revision Methods:**\n\n"
                   "- **Active Recall**: Testing yourself from memory instead of passively re-reading slides or highlighting notes. Generates stronger neural pathways.\n"
                   "- **Spaced Repetition**: Reviewing material at expanding intervals (Day 1, Day 3, Day 7, Day 14) to flatten Ebbinghaus's Forgetting Curve.\n"
                   "- **Feynman Technique**: Explain the concept out loud in plain, non-jargon language as if teaching a 10-year-old. Wherever you stutter or use vague buzzwords is where your knowledge gap lies!\n"
                   "- **Interleaving**: Alternating between distinct subjects (e.g., 45m Java + 10m break + 45m Discrete Math) rather than marathon 4-hour block cramming.",
        "practice": [
            "Try the 2-Minute Brain Dump: Close this tab, grab a blank page, and write down every single term you remember from your last lecture without looking."
        ],
        "strategy": "Use StudyPilot's Focus Timer for 25-minute sprints and the 'Rescue My Day' tool whenever schedules slip."
    }
}

def call_gemini_api(prompt: str, api_key: str, history: List[Dict[str, str]] = None) -> str:
    """
    Call Google Gemini REST API using Python's standard library urllib.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    contents = []
    # Add history
    if history:
        for msg in history[-6:]: # Keep recent context
            role = "user" if msg.get("role") == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("content", "")}]
            })

    contents.append({
        "role": "user",
        "parts": [{"text": prompt}]
    })

    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1000,
            "topP": 0.95
        }
    }

    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=12) as response:
        result = json.loads(response.read().decode('utf-8'))
        candidates = result.get("candidates", [])
        if candidates and "content" in candidates[0]:
            parts = candidates[0]["content"].get("parts", [])
            if parts:
                return parts[0].get("text", "")
        return "I received an empty response from Gemini. Please try asking again."

def generate_offline_response(prompt: str) -> str:
    """
    Generates rich, contextual, beginner-friendly responses when offline or no API key is supplied.
    """
    p_lower = prompt.lower()

    # Search for matches in offline knowledge base
    matched_entry = None
    if any(k in p_lower for k in ["tree", "bst", "binary search", "red black", "traversal", "avl"]):
        matched_entry = OFFLINE_TOPIC_KNOWLEDGE["tree"]
    elif any(k in p_lower for k in ["graph", "bfs", "dfs", "traversal", "dijkstra", "vertex", "edge"]):
        matched_entry = OFFLINE_TOPIC_KNOWLEDGE["graph"]
    elif any(k in p_lower for k in ["java", "oop", "object oriented", "polymorphism", "inheritance", "encapsulation"]):
        matched_entry = OFFLINE_TOPIC_KNOWLEDGE["java"]
    elif any(k in p_lower for k in ["math", "induction", "proof", "discrete", "set theory", "relation", "logic"]):
        matched_entry = OFFLINE_TOPIC_KNOWLEDGE["math"]
    elif any(k in p_lower for k in ["procrastinat", "strategy", "revision", "pomodoro", "study habit", "exam prep", "schedule", "routine", "technique"]):
        matched_entry = OFFLINE_TOPIC_KNOWLEDGE["strategy"]

    if matched_entry:
        wants_practice = any(w in p_lower for w in ["practice", "question", "quiz", "test", "problem"])
        wants_strategy = any(w in p_lower for w in ["how to study", "strategy", "tips", "plan", "revision"])

        resp = f"### 📚 {matched_entry['title']}\n\n"
        resp += f"{matched_entry['concept']}\n\n"

        if wants_practice or not wants_strategy:
            resp += "#### 🎯 High-Yield Practice Questions:\n"
            for q in matched_entry['practice']:
                resp += f"{q}\n\n"

        resp += "#### 💡 Recommended Revision Strategy:\n"
        resp += f"{matched_entry['strategy']}\n\n"
        resp += "*Pro-Tip: Schedule a 25-minute Pomodoro session in your StudyPilot dashboard to test this concept right now!*"
        return resp

    # General study advice response
    return (
        "### 🎓 StudyPilot Academic Strategy Guide\n\n"
        "Here is a proven framework for mastering complex college subjects:\n\n"
        "1. **Deconstruct the Topic**: Break the syllabus chapter into 3-4 subtopics (e.g. Definition, Algorithm/Formula, Edge Cases, Code/Proof).\n"
        "2. **Active Testing**: Don't just re-read textbook chapters. Explain the core mechanism out loud without looking.\n"
        "3. **Targeted Practice**: Complete 2-3 medium difficulty questions right after learning the theoretical concept.\n"
        "4. **Smart Timetabling**: If your schedule fell behind, use the **'Rescue My Day'** button on the dashboard to calculate an emergency study timetable!\n\n"
        "*(Ask me specifically about **Binary Search Trees**, **Graph BFS/DFS**, **Java OOP Principles**, **Discrete Math Proofs**, or **Practice Questions**!)*"
    )

def handle_coach_query(prompt: str, history: List[Dict[str, str]] = None, override_api_key: str = "") -> Dict[str, Any]:
    """
    Main entry point for AI study coach queries.
    Tries live Gemini API if key is present; falls back transparently to built-in knowledge engine.
    """
    api_key = override_api_key or os.environ.get("GEMINI_API_KEY", "").strip()

    if api_key:
        try:
            live_response = call_gemini_api(prompt, api_key, history)
            return {
                "success": True,
                "is_live_ai": True,
                "provider": "Google Gemini 1.5 Flash (Live AI)",
                "response": live_response
            }
        except Exception as e:
            fallback_text = generate_offline_response(prompt)
            return {
                "success": True,
                "is_live_ai": False,
                "provider": "StudyPilot Knowledge Engine (Offline Mode)",
                "error_notice": f"Live Gemini API connection unavailable: {str(e)[:80]}. Switched to local expert engine.",
                "response": fallback_text
            }

    # No API key provided -> Return genuine offline expert engine
    offline_text = generate_offline_response(prompt)
    return {
        "success": True,
        "is_live_ai": False,
        "provider": "StudyPilot Knowledge Engine (Offline Mode)",
        "response": offline_text
    }
