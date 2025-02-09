"use client";
import { useState } from "react";

export default function Home() {
  const [inputString, setInputString] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  interface KeywordsResponse {
    keywords: string[];
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    try {
    const res = await fetch("http://localhost:3001/api/keywords", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ str: inputString })
    });

    if (!res.ok) {
        throw new Error(`HTTP Error Status: ${res.status}`);
    }

    const data: KeywordsResponse = await res.json();
    setKeywords(data.keywords); 
    } catch (err) {
      console.error("Error fetching data:", (err as Error).message);
    }
  }


  return (
    <div>
      <h1>SoundscapeGen</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputString}
          onChange={e => setInputString(e.target.value)}
          placeholder="Describe your soundscape..."
        />
        <button type="submit">Get Keywords</button>
      </form>
      <div>
        <h2>Keywords:</h2>
        <ul>
          {keywords.map((kw, idx) => (
            <li key={idx}>{kw}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}