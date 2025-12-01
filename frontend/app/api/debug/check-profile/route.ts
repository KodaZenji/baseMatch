export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return new Response(JSON.stringify({ error: 'Address parameter required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate address format
        if (!address.match(/^0x[0-9a-fA-F]{40}$/)) {
            return new Response(JSON.stringify({ error: 'Invalid address format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            address,
            message: 'To check if you have a profile, go to your profile edit page and try to update it. If you get an error saying "Profile does not exist", you need to create one first. If you get a profile loaded, you already have one.'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('Error checking profile:', error);
        return new Response(JSON.stringify({ error: error.message || 'Failed to check profile' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
