const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client();


export async function googleVerify(token: string) {
  const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,  
  });


  
  const { email, given_name, family_name } = ticket.getPayload();

  return { email, name: given_name, surname: family_name };
}
