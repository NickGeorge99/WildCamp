export async function shareOrCopy(url, spotName, buttonEl) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: `${spotName} — WildCamp`,
        text: `Check out this campsite: ${spotName}`,
        url,
      })
      return
    } catch (err) {
      if (err.name === 'AbortError') return
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    if (buttonEl) {
      const original = buttonEl.innerHTML
      const originalBorder = buttonEl.style.borderColor
      buttonEl.innerHTML = '<span style="color:#22c55e;font-size:12px;font-weight:600">Copied!</span>'
      buttonEl.style.borderColor = '#22c55e'
      setTimeout(() => {
        buttonEl.innerHTML = original
        buttonEl.style.borderColor = originalBorder || ''
      }, 2000)
    }
  } catch {
    prompt('Copy this link:', url)
  }
}
