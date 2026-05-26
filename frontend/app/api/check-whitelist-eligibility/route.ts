import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest){

 const {wallet}=await req.json();

 const {data}=await supabase
 .from('whitelist_applications')
 .select('verification_status,whitelist_type')
 .eq(
   'wallet_address',
   wallet.toLowerCase()
 )
 .single();

 if(!data){
   return NextResponse.json({
      found:false
   });
 }

 return NextResponse.json({
    found:true,
    verification_status:data.verification_status,
    whitelist_type:data.whitelist_type
 });
}
