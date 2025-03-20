"use client";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export default function Anki() {
  //   ## Public Anki Card
  // | Column      | Type    | Description                           |
  // |------------|--------|---------------------------------------|
  // | id         | UUID   | Unique identifier for the card       |
  // | title      | STRING | Word or sentence                     |
  // | pronounce  | STRING | URL to pronunciation audio file      |
  // | create_date | DATE   | When the card was created           |
  // | language   | STRING | Language of the card (indexed with title) |

  // ---

  // ## Personal Card List
  // | Column     | Type    | Description                         |
  // |-----------|--------|-------------------------------------|
  // | list_id   | UUID   | Unique identifier for the list     |
  // | list_name | STRING | Name of the personal list         |
  // | user_id   | UUID   | Owner of the list                 |
  // | description | STRING | Description of the list          |
  // | create_date | DATE   | When the list was created        |
  // | edit_date | DATE   | When the list was last updated    |

  // ---

  // ## Personal Card
  // | Column          | Type    | Description                            |
  // |----------------|--------|----------------------------------------|
  // | id            | UUID   | Unique identifier for the personal card |
  // | anki_card_id  | UUID   | References `public_anki_card.id`        |
  // | list_id       | UUID   | References `personal_card_list.list_id` |
  // | user_id       | UUID   | Owner of the card                       |
  // | translate     | STRING | User's translation                      |
  // | create_date   | DATE   | When the card was created               |
  // | edit_date     | DATE   | When the card was last updated          |
  // | learned_times | INT    | Number of times reviewed                |
  // | last_learned_date | DATE | Last time this card was learned        |
  // | custom_notes  | STRING | User’s personal notes                   |
  // | status        | STRING | Learning status (e.g., learning, mastered) |

  const supabase = createClient();
  const [ankiCard, setAnkiCard] = useState<any[] | null>([]);
  const [myAnkiList, setMyAnkiList] = useState<any[] | null>([]);
  const [myAnkiCards, setMyAnkiCards] = useState<any[] | null>([]);
  const [user, setUser] = useState<any | null>();

  useEffect(() => {
    async function fetchData() {
      const user = await supabase.auth.getUser();
      setUser(user.data.user);

      const { data: ankiCard } = await supabase
        .from("public_anki_card")
        .select();
      setAnkiCard(ankiCard);
      const { data: myAnkiList } = await supabase
        .from("personal_card_list")
        .select();
      setMyAnkiList(myAnkiList);

      const { data: myAnkiCards, error } = await supabase
      .from("personal_card")
      .select(`
        *,
        public_anki_card (
          title,
          pronounce
        )
      `);
    
    if (error) {
      console.error("Error fetching Anki cards:", error);
    } else {
      // Flatten the structure
      const flattenedAnkiCards = myAnkiCards.map(card => ({
        id: card.id,
        anki_card_id: card.anki_card_id,
        list_id: card.list_id,
        user_id: card.user_id,
        translate: card.translate,
        create_date: card.create_date,
        edit_date: card.edit_date,
        learned_times: card.learned_times,
        last_learned_date: card.last_learned_date,
        custom_notes: card.custom_notes,
        status: card.status,
        title: card.public_anki_card.title, // Flattened title
        pronounce: card.public_anki_card.pronounce // Flattened pronounce
      }));
    
      setMyAnkiCards(flattenedAnkiCards);
    }
    }
    fetchData();
  }, []);

  async function createAnkiList() {
    const list_name = "My First List";
    const description = "This is my first list";

    const { data, error } = await supabase
      .from("personal_card_list")
      .insert([
        { list_name: list_name, description: description, user_id: user?.id },
      ])
      .select();
    console.log(data, error);
  }

  async function createMyAnkiCard() {
    const word = "Maito"; // The title to check
    const translate = "milk"; // The translation
    const list_id = myAnkiList[0].list_id; // Assuming you have a list_id from your context
    const note = "This is a note"; // Optional note
    const language = "fin"; // Specify the language for the card
    const status = "new";

    // Step 1: Check if the word already exists in public_anki_card
    const { data: ankiCard, error: ankiCardError } = await supabase
      .from("public_anki_card")
      .select("*")
      .eq("title", word)
      .eq("language", language) // Check for the same language
      .single(); // Use .single() to get a single record or null

    if (ankiCardError && ankiCardError.code !== "PGRST116") {
      // Handle error if not "not found"
      console.error("Error checking for existing card:", ankiCardError);
      return;
    }

    let ankiCardId;

    // Step 2: If the card does not exist, insert it into public_anki_card
    if (!ankiCard) {
      const { data: newAnkiCard, error: insertAnkiCardError } = await supabase
        .from("public_anki_card")
        .insert([
          {
            title: word,
            language: language,
            create_date: new Date().toISOString(), // Set the current date
          },
        ])
        .select()
        .single(); // Get the newly created card

      if (insertAnkiCardError) {
        console.error("Error inserting new Anki card:", insertAnkiCardError);
        return;
      }

      ankiCardId = newAnkiCard.id; // Use the ID of the newly created Anki card
    } else {
      ankiCardId = ankiCard.id; // Use the existing card's ID
    }

    // Step 3: Insert into personal_card using the anki_card_id
    const { data: personalCard, error: personalCardError } = await supabase
      .from("personal_card")
      .insert([
        {
          anki_card_id: ankiCardId, // Use the ID from the existing or newly created card
          list_id: list_id,
          user_id: user?.id, // Get the authenticated user's ID
          translate: translate,
          custom_notes: note,
          status: status,
        },
      ])
      .select();

    if (personalCardError) {
      console.error("Error inserting personal card:", personalCardError);
      return;
    }

    console.log("Personal card created successfully:", personalCard);
  }

  return (
    <div>
      <div>
        <p>public_anki_card</p>
        <pre>{JSON.stringify(ankiCard, null, 2)}</pre>
      </div>
      <div>
        <p>personal_card_list</p>
        <pre>{JSON.stringify(myAnkiList, null, 2)}</pre>
        <button onClick={() => createAnkiList()}>Create List</button>
      </div>
      <div>
        <p>personal_card</p>
        <pre>{JSON.stringify(myAnkiCards, null, 2)}</pre>
        <button onClick={() => createMyAnkiCard()}>Create Card</button>
      </div>
    </div>
  );
}
