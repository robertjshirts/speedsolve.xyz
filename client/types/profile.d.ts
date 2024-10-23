export { Profile };

declare global {
  interface Profile {
    id: string
    username: string
    email: string
    pfp: string
    createdAt: string
    updatedAt: string
  }
}
