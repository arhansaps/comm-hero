import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './client'

export async function uploadIssueMedia(
  file: File,
  issueId: string
): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const path = `issues/${issueId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file)
  return getDownloadURL(snapshot.ref)
}
