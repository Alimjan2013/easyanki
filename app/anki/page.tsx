import { createClient } from '@/utils/supabase/server';

export default async function Instruments() {
  const supabase = await createClient();
  const { data: ankiCard } = await supabase.from("public_anki_card").select();
  console.log(ankiCard);

  return <pre>{JSON.stringify(ankiCard, null, 2)}</pre>
}