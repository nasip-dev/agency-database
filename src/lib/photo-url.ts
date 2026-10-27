/** Ссылка на фото: большое или превью */
export function photoUrl(file: string, thumb = false) {
  return `/photos/${file}${thumb ? "_thumb" : ""}.webp`;
}
