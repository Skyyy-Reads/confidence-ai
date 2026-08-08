// ---------------- edge function call ----------------
async function generateQuestions(source, count, attachments){
  // images are sent as data URLs; the edge function needs a vision-capable
  // model call to actually read them alongside the typed notes/topic.
  const images = (attachments || [])
    .filter(a => a.type === 'image')
    .map(a => a.dataUrl);

  // The edge function requires a real logged-in user's access token — it
  // rejects the anon key on its own (see supabase/functions/generate-questions).
  const { data: { session } } = await supabaseClient.auth.getSession();
  if(!session){
    throw new Error('You need to be logged in to generate questions.');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ source, count, images })
  });
  if(!response.ok){
    let message = `Edge function error: ${response.status}`;
    try{
      const errBody = await response.json();
      if(errBody && errBody.error) message = errBody.error;
    }catch(e){ /* non-JSON error body, keep default message */ }
    throw new Error(message);
  }
  const data = await response.json();
  return data.questions;
}
