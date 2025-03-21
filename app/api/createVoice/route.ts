import type { NextRequest } from "next/server"
import { ElevenLabsClient } from "elevenlabs"


// Create ElevenLabs client
const ElevenLabs_Client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
})





export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { text } = await request.json()

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 })
    }


    // Convert text to speech
    const audio = await ElevenLabs_Client.textToSpeech.convert("Dkbbg7k9Ir9TNzn5GYLp", {
      model_id: "eleven_multilingual_v2",
      text,
      output_format: "mp3_44100_128",
    })

    // Get audio as buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of audio) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    const filename = `${text}-${Date.now()}.mp3`
    console.log("filename", filename)

    // Upload the buffer to S3
    const R2 = await fetch(`https://r2-worker.iooslo.workers.dev/${filename}`,{
      method:"PUT",
      headers:{
        "Content-Type":"audio/mpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
      body:buffer
    })

    console.log(R2)
    

    // Return the audio as a response with appropriate headers
    return new Response(JSON.stringify({ filename }), {
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error: any) {
    console.error("ElevenLabs API error:", error)
    return Response.json({ error: error.message || "Failed to convert text to speech" }, { status: 500 })
  }
}

