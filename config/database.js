const { createClient } = require("@supabase/supabase-js");

require("dotenv").config();

const supabase_url = process.env.URL_PROJ;
const supabase_api = process.env.API_KEY;

const supabase = createClient(supabase_url, supabase_api);

module.exports = supabase;