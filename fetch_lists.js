const url = "https://dvxhuqhsiguaygrwevdn.supabase.co/rest/v1/lists?select=*";
const key = "sb_publishable__y4Kh7GNd7qqO9VZyWv1Zg_yyUVrrd4";

async function run() {
  const res = await fetch(url, {
    headers: {
      "apikey": key,
      "Authorization": "Bearer " + key
    }
  });
  const data = await res.json();
  data.forEach(l => {
    console.log(`List: ${l.name} | is_public: ${l.is_public} | user_id: ${l.user_id}`);
  });
}
run();
