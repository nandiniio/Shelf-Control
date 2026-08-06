import { supabase } from './supabase.js';

async function checkLists() {
  const { data, error } = await supabase
    .from('lists')
    .select('*');

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Lists in DB:");
    data.forEach(l => console.log(`${l.id} - ${l.name} - is_public: ${l.is_public}`));
  }
}

checkLists();
