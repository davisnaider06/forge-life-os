import{NextResponse}from'next/server';
import{requireUser,sameOrigin,fail}from'@/lib/server';
import{connectToken}from'@/lib/pluggy';
export async function POST(req:Request){try{sameOrigin(req);const user=await requireUser(),token=await connectToken(user.id);return NextResponse.json({accessToken:token.accessToken,sandbox:process.env.PLUGGY_SANDBOX==='true'});}catch(e){return fail(e);}}
