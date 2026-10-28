// config/database.js
require('dotenv').config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.URL_PROJ;
const supabaseKey = process.env.API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Erro: URL_PROJ ou API_KEY não estão definidos no arquivo .env!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;