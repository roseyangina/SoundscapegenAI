"use client";
import { useState } from "react";

interface Sound {
  sound_number: string;
  name: string;
  description: string;
  sound_url: string;
}

export default function Home() {
  const [inputString, setInputString] = useState("");
  const [response, setResponse] = useState<{ keywords?: string[]; sounds?: Sound[] } | null>(null);

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

    const data = await res.json();
    setResponse(data); 
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

        {/* Display JSON response of both Keywords and Sounds  */}
        {response?.keywords?.length ? <pre>{JSON.stringify(response, null, 2)}</pre> : null}
    </div>
  );
}