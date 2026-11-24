# Media spec sheet

What to send for images, PDFs, and video on https://elevate-healthsolutions.com. "Limit" means the site rejects the file. "Recommended" means the file uploads either way but looks better this way.

## Images (Admin uploads)

| | |
|---|---|
| Formats (limit) | JPEG, PNG, WebP, GIF |
| Size (limit) | 5 MB per image |
| Alt text | Required. One short sentence describing the image. |
| Recommended size | 2000 px on the long edge. Smaller than 1200 px can look soft on large screens. |
| Recommended format | JPEG for photos, PNG for logos or images with text. |

The site crops images to fixed shapes. Keep the subject centred so the crop does not cut off faces.

| Where it appears | Shape |
|---|---|
| Homepage and page heroes, testimonial portraits | Portrait 4:5 |
| Shop products, downloads | 4:3 |
| Courses, library cards, recorded sessions | 16:9 |
| Offer bands (Reset, membership) | 16:10 |
| Blog article header | 2:1 |
| Video testimonial clips | Vertical 9:16 |

Social share image: the site currently uses a 1200 × 1200 square. Send a square image with the logo or face in the middle if you want to replace it.

## PDFs and downloads

| | |
|---|---|
| Product downloads (limit) | PDF only, 50 MB per file |
| Storage | Private bucket. Members get a short-lived signed link after their purchase is confirmed. |
| Course resources | Private bucket, signed links that expire after 15 minutes. Send the file to engineering to attach. |

Name files the way members should see them, for example `Reset Plan - Grocery List.pdf`. A file shared only in Google Drive does not appear on the site until it is attached to a product or course.

## Video

Videos are uploaded to Mux with signed playback, so paid videos cannot be shared by URL.

| | Recommended |
|---|---|
| Container and codec | MP4, H.264 video, AAC audio |
| Resolution | 1920 × 1080 (1080p) |
| Shape | Landscape 16:9 for lessons and recorded sessions. Vertical 9:16 for testimonial clips. |
| Frame rate | Same as the camera, usually 30 fps |
| Audio | One clear voice track. Avoid background music with lyrics under speech. |
| File name | Course, day, and part, for example `reset-day-3-evening.mp4` |

Mux accepts most other formats too. These are recommendations for consistent quality, not hard limits.

For a recorded live session, follow `docs/RECORDED_SESSION_WORKFLOW.md`. Uploading to Google Drive alone does not publish anything.
