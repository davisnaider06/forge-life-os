import{NextResponse}from'next/server';
import{requireUser,sameOrigin,fail,jsonBody,admin,HttpError}from'@/lib/server';
import{pushSchema}from'@/lib/push';
export async function POST(req:Request){try{sameOrigin(req);const user=await requireUser();if(!process.env.VAPID_PRIVATE_KEY)throw new HttpError(503,'O serviço de notificações ainda não foi configurado.');const subscription=pushSchema.parse(await jsonBody(req,4096));const{error}=await admin().from('forge_push_subscriptions').upsert({user_id:user.id,endpoint:subscription.endpoint,subscription},{onConflict:'endpoint'});if(error)throw new HttpError(503,'Não foi possível salvar a preferência.');return NextResponse.json({subscribed:true});}catch(e){return fail(e);}}
