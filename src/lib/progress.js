'use strict'

const subject = new Rx.Subject()

export const updateProgress = (tag, text, args) =>
  subject.next({tag, text, args})

export const updateProgressTagged = tag =>
  (text, args) => updateProgress(tag, text, args)

export const progress$ = subject

global.UPDATEPROGRESS = updateProgress
