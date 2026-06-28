export type Certificate = {
  id: string
  certificateNumber: string
  courseId: string
  userId: string
  issuedAt: string
  verificationToken: string
  pdfStoragePath: string | null
}

export type CertificateWithCourse = Certificate & {
  course: {
    id: string
    title: string
    slug: string
  }
}

export type VerifiedCertificate = {
  certificateNumber: string
  courseTitle: string
  recipientName: string
  issuedAt: string
}
