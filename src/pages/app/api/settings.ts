import {
  getUserUsername,
  getCookie,
  setUserUsername,
  updateOwnUsername
} from '@lib/auth'

import {
  addActivity,
} from '@src/data/pocketbase'

import type { APIRoute } from 'astro'

export const PUT: APIRoute = async ({ request }) => {
  const formData = await request.formData()
  let username = formData.get('username') as string
  username = username.replace(/[^a-zA-Z0-9]/g, '') as string

  if (username.length < 3) {
    return new Response(
      'Username must be 3 chars or more',
      {
        status: 400
      }
    )
  }
  try {
    await updateOwnUsername(username)
  } catch (e) {
    //most probably username already taken
    return new Response('Username already taken', {
      status: 400
    })
  }

  await addActivity({
    team: '',
    project: '',
    text: `Username changed from ${await getUserUsername(request)} to ${username}`,
    type: 'username_change'
  })

  setUserUsername(username)

  return new Response(null, {
    status: 204,
    headers: {
      statusText: 'No Content',
      'Set-Cookie': getCookie(),
      'HX-Redirect': '/app/settings'
    }
  })
}
