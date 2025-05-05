const API_URL = `${import.meta.env.VITE_API_PROTOCOL}://${import.meta.env.VITE_API_URL}`

export async function getProfile(username: string): Promise<Profile> {
  const response = await fetch(`${API_URL}/profile/${username}`)
  console.log("getting profile", username)
  return response.json()
}

export async function updateProfile(username: string, updatedData: Partial<Profile>, token: string): Promise<Profile> {
  console.log("updating profile", username, updatedData)
  const response = await fetch(`${API_URL}/profile/${username}`, {
      method: 'PUT',
      body: JSON.stringify(updatedData),
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
  })
  return response.json()
}