;(function () {
  var container = document.getElementById('document-rows')
  var addLink = document.getElementById('add-another-document')
  var dataEl = document.getElementById('document-type-items-data')
  var documentTypeItems = dataEl ? JSON.parse(dataEl.textContent) : []

  if (!container || !addLink) return

  function getNextIndex () {
    return container.querySelectorAll('.document-row').length
  }

  function buildOptionsHtml () {
    var opts = '<option value="">Select document type</option>'
    documentTypeItems.forEach(function (item) {
      if (item.value) {
        opts += '<option value="' + item.value + '">' + item.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '</option>'
      }
    })
    return opts
  }

  function renumberRows () {
    var rows = container.querySelectorAll('.document-row')
    rows.forEach(function (row, i) {
      row.setAttribute('data-index', i)
      var h2 = row.querySelector('h2')
      if (h2) h2.textContent = 'Document ' + (i + 1)
      var inputs = row.querySelectorAll('[id], [name], [for], [data-for]')
      inputs.forEach(function (el) {
        if (el.id && el.id.match(/-\d+$/)) el.id = el.id.replace(/-\d+$/, '-' + i)
        if (el.name && el.name.match(/_\d+$/)) el.name = el.name.replace(/\d+$/, i)
        if (el.getAttribute('for') && el.getAttribute('for').match(/-\d+$/)) el.setAttribute('for', el.getAttribute('for').replace(/-\d+$/, '-' + i))
        var df = el.getAttribute('data-for')
        if (df && df.match(/document-attachment-\d+$/)) el.setAttribute('data-for', 'document-attachment-' + i)
      })
      var removeLink = row.querySelector('.remove-document')
      if (removeLink) {
        removeLink.setAttribute('data-index', i)
        removeLink.style.display = rows.length > 1 ? '' : 'none'
      }
      var removeAtt = row.querySelector('.remove-attachment')
      if (removeAtt) removeAtt.setAttribute('data-index', i)
    })
    addLink.style.display = container.querySelectorAll('.document-row').length >= 1 ? '' : 'none'
  }

  function updateAttachmentDisplay (input) {
    var index = input.id.replace('document-attachment-', '')
    var listEl = document.getElementById('attachment-list-dynamic-' + index)
    var filenamesEl = listEl && listEl.querySelector('.attachment-filenames')
    var hiddenEl = document.querySelector('input[name="documentAttachmentFilenames_' + index + '"]')
    var control = input.closest('.attachment-control')
    var addArea = control && control.querySelector('.attachment-add-area')
    if (!listEl || !filenamesEl || !hiddenEl) return
    var files = [].slice.call(input.files || [])
    var names = files.map(function (f) { return f.name })
    if (names.length === 0) {
      listEl.classList.add('attachment-hidden')
      hiddenEl.value = ''
      if (addArea) addArea.classList.remove('attachment-hidden')
    } else {
      listEl.classList.remove('attachment-hidden')
      if (addArea) addArea.classList.add('attachment-hidden')
      filenamesEl.innerHTML = '<p class="govuk-body" aria-live="polite">Uploading your file...</p>'
      hiddenEl.value = names.join(',')
      setTimeout(function () {
        filenamesEl.innerHTML = names.map(function (n, i) {
          var escaped = n.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
          return '<div class="govuk-body attachment-item-dynamic"><span>' + escaped + '</span><div class="govuk-!-margin-top-3 govuk-!-font-size-16"><a href="#" class="govuk-link govuk-link--no-visited-state govuk-!-font-size-16 view-attachment" data-index="' + index + '" data-file-index="' + i + '">View attachment</a> <span aria-hidden="true">|</span> <a href="#" class="govuk-link govuk-link--secondary govuk-!-font-size-16 remove-all-attachments" data-for="document-attachment-' + index + '">Remove attachment</a></div></div>'
        }).join('')
      }, 1500)
    }
  }

  function clearAttachments (index) {
    var input = document.getElementById('document-attachment-' + index)
    var listDynamic = document.getElementById('attachment-list-dynamic-' + index)
    var listServer = document.getElementById('attachment-list-server-' + index)
    var hiddenEl = document.querySelector('input[name="documentAttachmentFilenames_' + index + '"]')
    var control = input && input.closest('.attachment-control')
    var addArea = control && control.querySelector('.attachment-add-area')
    if (input) {
      input.value = ''
    }
    if (listDynamic) {
      listDynamic.classList.add('attachment-hidden')
      var filenamesEl = listDynamic.querySelector('.attachment-filenames')
      if (filenamesEl) filenamesEl.innerHTML = ''
    }
    if (listServer) {
      listServer.classList.add('attachment-hidden')
    }
    if (hiddenEl) {
      hiddenEl.value = ''
    }
    if (addArea) {
      addArea.classList.remove('attachment-hidden')
    }
  }

  container.addEventListener('click', function (e) {
    if (e.target.classList.contains('remove-document')) {
      e.preventDefault()
      var row = e.target.closest('.document-row')
      if (row && container.querySelectorAll('.document-row').length > 1) {
        row.remove()
        renumberRows()
      }
    }
    if (e.target.classList.contains('add-attachment-link')) {
      e.preventDefault()
      var id = e.target.getAttribute('data-for')
      var input = id && document.getElementById(id)
      if (input) input.click()
    }
    if (e.target.classList.contains('remove-all-attachments') || e.target.classList.contains('remove-attachment')) {
      e.preventDefault()
      var idx = e.target.getAttribute('data-for') || e.target.getAttribute('data-index')
      if (idx !== null) {
        idx = typeof idx === 'string' && idx.indexOf('document-attachment-') === 0 ? idx.replace('document-attachment-', '') : idx
        clearAttachments(idx)
      }
    }
    if (e.target.classList.contains('view-attachment')) {
      e.preventDefault()
      var docIdx = e.target.getAttribute('data-index')
      var fileIdx = parseInt(e.target.getAttribute('data-file-index'), 10) || 0
      var input = document.getElementById('document-attachment-' + docIdx)
      if (input && input.files && input.files[fileIdx]) {
        var file = input.files[fileIdx]
        var url = URL.createObjectURL(file)
        window.open(url, '_blank', 'noopener,noreferrer')
        setTimeout(function () { URL.revokeObjectURL(url) }, 60000)
      }
    }
  })

  container.addEventListener('change', function (e) {
    if (e.target.type === 'file' && e.target.name && e.target.name.indexOf('documentAttachment_') === 0) {
      updateAttachmentDisplay(e.target)
    }
  })

  addLink.addEventListener('click', function (e) {
    e.preventDefault()
    var index = getNextIndex()
    var row = document.createElement('div')
    row.className = 'document-section document-row'
    row.setAttribute('data-index', index)
    row.innerHTML = '<div class="document-row-header">' +
      '<h2 class="govuk-heading-m govuk-!-margin-bottom-0">Document ' + (index + 1) + '</h2>' +
      '<a href="#" class="govuk-link govuk-link--secondary govuk-!-font-size-16 remove-document" data-index="' + index + '">Remove this document</a>' +
    '</div>' +
    '<div class="govuk-form-group govuk-!-margin-bottom-4">' +
      '<label class="govuk-label" for="document-type-' + index + '">Document type</label>' +
      '<select class="govuk-select" id="document-type-' + index + '" name="documentType_' + index + '">' + buildOptionsHtml() + '</select>' +
    '</div>' +
    '<div class="govuk-form-group govuk-!-margin-bottom-4">' +
      '<label class="govuk-label" for="document-reference-' + index + '">Document reference</label>' +
      '<input class="govuk-input" id="document-reference-' + index + '" name="documentReference_' + index + '" type="text">' +
    '</div>' +
    '<div class="govuk-form-group govuk-!-margin-bottom-4">' +
      '<label class="govuk-label" for="document-date-' + index + '">Date of issue</label>' +
      '<div class="govuk-hint" id="document-date-' + index + '-hint">For example, 27 3 2024</div>' +
      '<input class="govuk-input govuk-input--width-10" id="document-date-' + index + '" name="documentDate_' + index + '" type="date" aria-describedby="document-date-' + index + '-hint">' +
    '</div>' +
    '<div class="govuk-form-group govuk-!-margin-bottom-4">' +
      '<label class="govuk-label" for="document-attachment-' + index + '">Attachment</label>' +
      '<input class="govuk-file-upload attachment-input-hidden" id="document-attachment-' + index + '" name="documentAttachment_' + index + '" type="file" aria-describedby="document-attachment-' + index + '-hint">' +
      '<input type="hidden" name="documentAttachmentFilenames_' + index + '" value="">' +
      '<div class="govuk-hint govuk-!-margin-top-2 attachment-add-area" id="document-attachment-' + index + '-hint">' +
        '<p class="govuk-hint govuk-!-margin-bottom-1 govuk-!-font-weight-bold">Your file must be:</p>' +
        '<ul class="govuk-list govuk-list--bullet govuk-hint govuk-!-margin-bottom-2">' +
          '<li>smaller than 50MB</li>' +
          '<li>PDF, DOC, DOCX, JPEG, PNG or XLS</li>' +
          '<li>ZIP files are not allowed for security reasons</li>' +
        '</ul>' +
        '<button type="button" class="govuk-button govuk-button--secondary govuk-button--small add-attachment-link govuk-!-margin-top-0 govuk-!-margin-bottom-0" data-for="document-attachment-' + index + '">Add attachment</button>' +
      '</div>' +
      '<div class="attachment-list attachment-list-dynamic attachment-hidden govuk-!-margin-top-3" id="attachment-list-dynamic-' + index + '">' +
        '<div class="attachment-filenames"></div>' +
      '</div>' +
    '</div>'
    var addAnotherEl = addLink.closest('.add-another-document')
    if (addAnotherEl && addAnotherEl.parentNode === container) {
      container.insertBefore(row, addAnotherEl)
    } else {
      container.appendChild(row)
    }
    renumberRows()
  })
})()
