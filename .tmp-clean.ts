import { createClient } from "@supabase/supabase-js";
const admin=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const {data}=await admin.auth.admin.listUsers({perPage:200});
for(const u of data.users.filter(u=>u.email?.endsWith("@teste-hospeda.ao"))){await admin.from("profiles").update({establishment_id:null}).eq("id",u.id);}
const {data:es}=await admin.from("establishments").select("id").in("name",["Pousada A","Pousada B"]);
for(const e of es??[]){await admin.from("user_roles").delete().eq("establishment_id",e.id);await admin.from("establishment_invites").delete().eq("establishment_id",e.id);await admin.from("audit_logs").delete().eq("establishment_id",e.id);const r=await admin.from("establishments").delete().eq("id",e.id);if(r.error)console.log(r.error.message);}
for(const u of data.users.filter(u=>u.email?.endsWith("@teste-hospeda.ao"))){await admin.from("profiles").delete().eq("id",u.id);await admin.auth.admin.deleteUser(u.id);}
console.log("limpo");
