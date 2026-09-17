import { SITE } from '../consts';
export function GET() {
 const publisher = /^ca-pub-\d{16}$/.test(SITE.adsensePublisherId) ? SITE.adsensePublisherId.replace(/^ca-/,'') : '';
 return new Response(publisher ? 'google.com, '+publisher+', DIRECT, f08c47fec0942fa0\n' : '# No advertising sellers configured.\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
