import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import './App.css'

function App() {
  const [chats, setChats] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [message, setMessage] = useState('')
  const [sources, setSources] = useState([
    { id: 1, name: 'Sarbath Tech Jana Inv', type: 'excel', size: '12.5 KB' },
    { id: 2, name: 'Sarbath Tech May Inv', type: 'csv', size: '8.2 KB' },
    { id: 3, name: 'Sales Employee List', type: 'pdf', size: '245 KB' }
  ])
  const [showSettings, setShowSettings] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('gemini')
  const [apiKeys, setApiKeys] = useState({
    gemini: '',
    openai: '',
    ollama: 'http://localhost:11434' // Default Ollama URL
  })
  const [availableModels, setAvailableModels] = useState({
    gemini: [],
    openai: [],
    ollama: []
  })
  const [selectedModel, setSelectedModel] = useState({
    gemini: '',
    openai: '',
    ollama: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingModels, setIsCheckingModels] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileContext, setFileContext] = useState('')
  const [excelData, setExcelData] = useState(null)
  const [sheetContexts, setSheetContexts] = useState({})
  const [columnContexts, setColumnContexts] = useState({})
  const [activeSheetTab, setActiveSheetTab] = useState(0)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [currentEditingSource, setCurrentEditingSource] = useState(null)
  const [showSourceMenu, setShowSourceMenu] = useState(null)

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedProvider = localStorage.getItem('ai-provider') || 'gemini'
    const savedApiKeys = JSON.parse(localStorage.getItem('api-keys') || '{}')
    const savedModels = JSON.parse(localStorage.getItem('selected-models') || '{}')

    setSelectedProvider(savedProvider)
    setApiKeys(prev => ({ ...prev, ...savedApiKeys }))
    setSelectedModel(prev => ({ ...prev, ...savedModels }))

    // Load existing contexts from backend
    loadExistingContexts()
  }, [])

  // Close source menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSourceMenu && !event.target.closest('.source-menu-container')) {
        setShowSourceMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSourceMenu])

  const loadExistingContexts = async () => {
    try {
      const contexts = await getAllContextsFromBackend()
      if (contexts && contexts.length > 0) {
        // Convert backend contexts to sources format
        const backendSources = contexts.map(context => ({
          id: context.fileId,
          name: context.fileName,
          type: context.fileType,
          size: context.fileSize,
          fileContext: context.fileContext,
          sheetContexts: context.sheetContexts,
          columnContexts: context.columnContexts,
          uploadDate: context.uploadDate,
          backendId: context._id || context.id,
          fromBackend: true
        }))

        // Merge with existing sources (avoid duplicates)
        setSources(prev => {
          const existingIds = prev.map(s => s.id)
          const newSources = backendSources.filter(s => !existingIds.includes(s.id))
          return [...newSources, ...prev]
        })
      }
    } catch (error) {
      console.error('Error loading existing contexts:', error)
    }
  }

  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: 'New Chat',
      messages: []
    }
    setChats([newChat, ...chats])
    setCurrentChat(newChat)
  }

  // Check available models for each provider
  const checkGeminiModels = async (apiKey) => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
      if (!response.ok) throw new Error('Invalid API key')

      const data = await response.json()
      const models = data.models
        .filter(model => model.name.includes('gemini'))
        .map(model => ({
          id: model.name.split('/')[1],
          name: model.displayName || model.name.split('/')[1]
        }))

      return models
    } catch (error) {
      console.error('Error checking Gemini models:', error)
      return []
    }
  }

  const checkOpenAIModels = async (apiKey) => {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Invalid API key')

      const data = await response.json()
      const models = data.data
        .filter(model => model.id.includes('gpt'))
        .map(model => ({
          id: model.id,
          name: model.id
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      return models
    } catch (error) {
      console.error('Error checking OpenAI models:', error)
      return []
    }
  }

  const checkOllamaModels = async (baseUrl) => {
    try {
      const response = await fetch(`${baseUrl}/api/tags`)
      if (!response.ok) throw new Error('Cannot connect to Ollama')

      const data = await response.json()
      const models = data.models.map(model => ({
        id: model.name,
        name: model.name
      }))

      return models
    } catch (error) {
      console.error('Error checking Ollama models:', error)
      return []
    }
  }

  const checkModelsForProvider = async (provider, apiKey) => {
    setIsCheckingModels(true)
    let models = []

    try {
      switch (provider) {
        case 'gemini':
          models = await checkGeminiModels(apiKey)
          break
        case 'openai':
          models = await checkOpenAIModels(apiKey)
          break
        case 'ollama':
          models = await checkOllamaModels(apiKey)
          break
      }

      setAvailableModels(prev => ({
        ...prev,
        [provider]: models
      }))

      // Auto-select first model if none selected
      if (models.length > 0 && !selectedModel[provider]) {
        setSelectedModel(prev => ({
          ...prev,
          [provider]: models[0].id
        }))
      }
    } catch (error) {
      console.error(`Error checking ${provider} models:`, error)
    } finally {
      setIsCheckingModels(false)
    }
  }

  // Get available context for AI
  const getAvailableContext = () => {
    const contextSummary = sources
      .filter(source => source.fileContext || source.sheetContexts)
      .map(source => {
        let summary = `File: ${source.name} (${source.type})\n`
        summary += `Description: ${source.fileContext || 'No description'}\n`

        if (source.sheetContexts) {
          Object.keys(source.sheetContexts).forEach(sheetName => {
            if (source.sheetContexts[sheetName]) {
              summary += `Sheet "${sheetName}": ${source.sheetContexts[sheetName]}\n`
            }
          })
        }

        if (source.columnContexts) {
          Object.keys(source.columnContexts).forEach(sheetName => {
            const columns = source.columnContexts[sheetName]
            if (columns && Object.keys(columns).length > 0) {
              summary += `Columns in "${sheetName}": ${Object.keys(columns).join(', ')}\n`
            }
          })
        }

        return summary
      })
      .join('\n---\n')

    return contextSummary || null
  }

  // Get summary of available data for relevance checking
  const getDataSummary = () => {
    if (sources.length === 0) return null

    const summary = sources
      .filter(source => source.fileContext || source.sheetContexts)
      .map(source => `${source.name} (${source.type}): ${source.fileContext || 'data file'}`)
      .join(', ')

    return summary
  }

  // Check if user question is relevant to uploaded data
  const isQuestionRelevantToData = async (userMessage) => {
    const dataSummary = getDataSummary()
    if (!dataSummary) {
      console.log('No data summary available, skipping relevance check')
      return false
    }

    console.log(`Checking relevance for: "${userMessage}"`)
    console.log(`Available data: ${dataSummary}`)

    // Use a lightweight check with the current AI provider
    const relevancePrompt = `You are a relevance checker. Determine if the following user question is asking about data, files, or information that could be found in these uploaded files: ${dataSummary}

User question: "${userMessage}"

Respond with only "YES" if the question is about the data/files, or "NO" if it's a general question unrelated to the uploaded data.`

    try {
      let response = ''

      switch (selectedProvider) {
        case 'gemini':
          response = await callGeminiAPISimple(relevancePrompt)
          break
        case 'openai':
          response = await callOpenAIAPISimple(relevancePrompt)
          break
        case 'ollama':
          response = await callOllamaAPISimple(relevancePrompt)
          break
        default:
          console.log('No AI provider configured, skipping context')
          return false // If no provider configured, don't include context
      }

      console.log(`Relevance check response: "${response}"`)
      const isRelevant = response.trim().toUpperCase().includes('YES')
      return isRelevant
    } catch (error) {
      console.error('Error checking question relevance:', error)
      // If relevance check fails, include context to be safe
      return true
    }
  }

  // Simple AI API calls for relevance checking (without context)
  const callGeminiAPISimple = async (prompt) => {
    const apiKey = apiKeys.gemini
    const model = selectedModel.gemini || 'gemini-1.5-flash'

    if (!apiKey) throw new Error('No Gemini API key configured')

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    return data.candidates[0]?.content?.parts[0]?.text || 'No response'
  }

  const callOpenAIAPISimple = async (prompt) => {
    const apiKey = apiKeys.openai
    const model = selectedModel.openai || 'gpt-3.5-turbo'

    if (!apiKey) throw new Error('No OpenAI API key configured')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'No response'
  }

  const callOllamaAPISimple = async (prompt) => {
    const baseUrl = apiKeys.ollama
    const model = selectedModel.ollama

    if (!model) throw new Error('No Ollama model selected')

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = await response.json()
    return data.response || 'No response'
  }

  // AI API calling functions
  const callGeminiAPI = async (userMessage) => {
    const apiKey = apiKeys.gemini
    const model = selectedModel.gemini || 'gemini-1.5-flash'

    if (!apiKey) {
      return "Please configure your Gemini API key in settings to use AI responses."
    }

    // Check if question is relevant to uploaded data
    const isRelevant = await isQuestionRelevantToData(userMessage)
    console.log(`Question relevance check: "${userMessage}" -> ${isRelevant ? 'RELEVANT' : 'NOT RELEVANT'}`)

    // Prepare message with context only if relevant
    const availableContext = isRelevant ? getAvailableContext() : null
    const contextualMessage = availableContext
      ? `Context about available data files:\n${availableContext}\n\nUser question: ${userMessage}`
      : userMessage

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: contextualMessage
            }]
          }]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()

      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        return data.candidates[0].content.parts[0].text
      } else {
        console.error('Unexpected API response structure:', data)
        return "I apologize, but I couldn't generate a response. Please try again."
      }
    } catch (error) {
      console.error('Gemini API Error:', error)
      return `Error: ${error.message}. Please check your API key and try again.`
    }
  }

  const callOpenAIAPI = async (userMessage) => {
    const apiKey = apiKeys.openai
    const model = selectedModel.openai || 'gpt-3.5-turbo'

    if (!apiKey) {
      return "Please configure your OpenAI API key in settings to use AI responses."
    }

    // Check if question is relevant to uploaded data
    const isRelevant = await isQuestionRelevantToData(userMessage)
    console.log(`Question relevance check: "${userMessage}" -> ${isRelevant ? 'RELEVANT' : 'NOT RELEVANT'}`)

    // Prepare messages with context only if relevant
    const availableContext = isRelevant ? getAvailableContext() : null
    const messages = []

    if (availableContext) {
      messages.push({
        role: 'system',
        content: `You have access to the following data files and their context:\n${availableContext}\n\nUse this information to provide accurate and relevant responses about the data.`
      })
    }

    messages.push({
      role: 'user',
      content: userMessage
    })

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI API Error Response:', errorText)
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()

      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content
      } else {
        console.error('Unexpected OpenAI API response structure:', data)
        return "I apologize, but I couldn't generate a response. Please try again."
      }
    } catch (error) {
      console.error('OpenAI API Error:', error)
      return `Error: ${error.message}. Please check your API key and try again.`
    }
  }

  const callOllamaAPI = async (userMessage) => {
    const baseUrl = apiKeys.ollama
    const model = selectedModel.ollama

    if (!model) {
      return "Please select an Ollama model in settings to use AI responses."
    }

    // Check if question is relevant to uploaded data
    const isRelevant = await isQuestionRelevantToData(userMessage)
    console.log(`Question relevance check: "${userMessage}" -> ${isRelevant ? 'RELEVANT' : 'NOT RELEVANT'}`)

    // Prepare prompt with context only if relevant
    const availableContext = isRelevant ? getAvailableContext() : null
    const contextualPrompt = availableContext
      ? `Context about available data files:\n${availableContext}\n\nUser question: ${userMessage}\n\nPlease provide a helpful response based on the available data context.`
      : userMessage

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: contextualPrompt,
          stream: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Ollama API Error Response:', errorText)
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()

      if (data.response) {
        return data.response
      } else {
        console.error('Unexpected Ollama API response structure:', data)
        return "I apologize, but I couldn't generate a response. Please try again."
      }
    } catch (error) {
      console.error('Ollama API Error:', error)
      return `Error: ${error.message}. Please check your Ollama connection and try again.`
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !currentChat) return

    const userMessage = message
    const newMessage = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date()
    }

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, newMessage]
    }

    setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat))
    setCurrentChat(updatedChat)
    setMessage('')
    setIsLoading(true)

    // Get AI response based on selected provider
    try {
      let aiResponseText = ''

      switch (selectedProvider) {
        case 'gemini':
          aiResponseText = await callGeminiAPI(userMessage)
          break
        case 'openai':
          aiResponseText = await callOpenAIAPI(userMessage)
          break
        case 'ollama':
          aiResponseText = await callOllamaAPI(userMessage)
          break
        default:
          aiResponseText = "Please configure an AI provider in settings."
      }

      const aiResponse = {
        id: Date.now() + 1,
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date()
      }

      const chatWithResponse = {
        ...updatedChat,
        messages: [...updatedChat.messages, aiResponse]
      }

      setChats(prevChats => prevChats.map(chat => chat.id === currentChat.id ? chatWithResponse : chat))
      setCurrentChat(chatWithResponse)
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = () => {
    localStorage.setItem('ai-provider', selectedProvider)
    localStorage.setItem('api-keys', JSON.stringify(apiKeys))
    localStorage.setItem('selected-models', JSON.stringify(selectedModel))
    setShowSettings(false)
  }

  const handleApiKeyChange = (provider, value) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: value
    }))

    // Clear models when API key changes
    setAvailableModels(prev => ({
      ...prev,
      [provider]: []
    }))
    setSelectedModel(prev => ({
      ...prev,
      [provider]: ''
    }))
  }

  const handleProviderChange = (provider) => {
    setSelectedProvider(provider)
  }

  const handleModelChange = (provider, modelId) => {
    setSelectedModel(prev => ({
      ...prev,
      [provider]: modelId
    }))
  }

  // File upload and processing functions
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const isExcel = file.name.match(/\.(xlsx|xls)$/)
    const isCsv = file.name.match(/\.csv$/)

    if (!isExcel && !isCsv) {
      alert('Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)')
      return
    }

    setUploadedFile(file)
    setIsProcessingFile(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let sheetsData = {}
        const initialSheetContexts = {}
        const initialColumnContexts = {}

        if (isCsv) {
          // Process CSV file
          const csvText = e.target.result
          const lines = csvText.split('\n').filter(line => line.trim())

          if (lines.length === 0) {
            throw new Error('CSV file is empty')
          }

          // Parse CSV (simple parsing - handles basic CSV format)
          const parseCSVLine = (line) => {
            const result = []
            let current = ''
            let inQuotes = false

            for (let i = 0; i < line.length; i++) {
              const char = line[i]

              if (char === '"') {
                inQuotes = !inQuotes
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim())
                current = ''
              } else {
                current += char
              }
            }
            result.push(current.trim())
            return result
          }

          const headers = parseCSVLine(lines[0])
          const data = lines.slice(1).map(line => parseCSVLine(line))

          // Create single sheet for CSV
          const sheetName = file.name.replace('.csv', '') || 'Sheet1'
          sheetsData[sheetName] = {
            headers: headers,
            data: data,
            rowCount: data.length
          }

          // Initialize contexts
          initialSheetContexts[sheetName] = ''
          initialColumnContexts[sheetName] = {}
          headers.forEach(header => {
            if (header) {
              initialColumnContexts[sheetName][header] = ''
            }
          })

        } else {
          // Process Excel file
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })

          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

            // Get column headers (first row)
            const headers = jsonData[0] || []

            sheetsData[sheetName] = {
              headers: headers,
              data: jsonData.slice(1), // Data without headers
              rowCount: jsonData.length - 1
            }

            // Initialize contexts
            initialSheetContexts[sheetName] = ''
            initialColumnContexts[sheetName] = {}
            headers.forEach(header => {
              if (header) {
                initialColumnContexts[sheetName][header] = ''
              }
            })
          })
        }

        setExcelData(sheetsData)
        setSheetContexts(initialSheetContexts)
        setColumnContexts(initialColumnContexts)
        setActiveSheetTab(0)
        setIsProcessingFile(false)

      } catch (error) {
        console.error('Error processing file:', error)
        alert(`Error processing file: ${error.message}. Please make sure it's a valid Excel or CSV file.`)
        setIsProcessingFile(false)
      }
    }

    if (file.name.match(/\.csv$/)) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  }

  const handleSheetContextChange = (sheetName, context) => {
    setSheetContexts(prev => ({
      ...prev,
      [sheetName]: context
    }))
  }

  const handleColumnContextChange = (sheetName, columnName, context) => {
    setColumnContexts(prev => ({
      ...prev,
      [sheetName]: {
        ...prev[sheetName],
        [columnName]: context
      }
    }))
  }

  const generateMarkdownContent = (fileName, fileType, fileSize, isSingleSheet, finalFileContext, sheetContexts, columnContexts, excelData) => {
    const timestamp = new Date().toLocaleString()
    const baseFileName = fileName.replace(/\.(xlsx|xls|csv)$/i, '')

    let markdown = `# ${baseFileName} - Data Context Documentation\n\n`
    markdown += `**File Name:** ${fileName}\n`
    markdown += `**File Type:** ${fileType.toUpperCase()}\n`
    markdown += `**File Size:** ${fileSize}\n`
    markdown += `**Upload Date:** ${timestamp}\n`
    markdown += `**Number of Sheets:** ${Object.keys(excelData).length}\n\n`

    markdown += `## File Overview\n\n`
    markdown += `${finalFileContext || 'No file description provided.'}\n\n`

    // Add sheet information
    Object.keys(excelData).forEach((sheetName, index) => {
      const sheet = excelData[sheetName]

      if (isSingleSheet) {
        markdown += `## Data Structure\n\n`
      } else {
        markdown += `## Sheet ${index + 1}: ${sheetName}\n\n`
        markdown += `**Sheet Description:** ${sheetContexts[sheetName] || 'No description provided.'}\n\n`
      }

      markdown += `**Total Rows:** ${sheet.rowCount}\n`
      markdown += `**Total Columns:** ${sheet.headers.length}\n\n`

      // Column descriptions
      markdown += `### Column Descriptions\n\n`
      markdown += `| Column Name | Description |\n`
      markdown += `|-------------|-------------|\n`

      sheet.headers.forEach(header => {
        if (header) {
          const description = columnContexts[sheetName]?.[header] || 'No description provided.'
          markdown += `| ${header} | ${description} |\n`
        }
      })

      markdown += `\n`

      // Data preview
      markdown += `### Data Preview\n\n`
      if (sheet.data.length > 0) {
        // Create table header
        markdown += `| ${sheet.headers.join(' | ')} |\n`
        markdown += `|${sheet.headers.map(() => '---').join('|')}|\n`

        // Add first 3 rows of data
        const previewRows = sheet.data.slice(0, 3)
        previewRows.forEach(row => {
          const paddedRow = [...row]
          // Pad row to match header length
          while (paddedRow.length < sheet.headers.length) {
            paddedRow.push('')
          }
          markdown += `| ${paddedRow.slice(0, sheet.headers.length).join(' | ')} |\n`
        })

        if (sheet.data.length > 3) {
          markdown += `\n*Showing first 3 rows of ${sheet.data.length} total rows.*\n`
        }
      } else {
        markdown += `*No data rows available.*\n`
      }

      markdown += `\n`
    })

    // Add metadata section
    markdown += `## Metadata\n\n`
    markdown += `- **Generated by:** tottho.ai Data Upload System\n`
    markdown += `- **Generation Date:** ${timestamp}\n`
    markdown += `- **File Structure:** ${isSingleSheet ? 'Single Sheet' : 'Multi-Sheet'}\n`

    return markdown
  }

  const downloadMarkdownFile = (content, fileName) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Backend API functions for context storage
  const saveContextToBackend = async (contextData) => {
    try {
      const response = await fetch('/api/context/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contextData)
      })

      if (!response.ok) {
        throw new Error(`Failed to save context: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error saving context to backend:', error)
      // Don't throw error to prevent blocking the UI workflow
      return null
    }
  }

  const getContextFromBackend = async (fileId) => {
    try {
      const response = await fetch(`/api/context/${fileId}`)

      if (!response.ok) {
        throw new Error(`Failed to get context: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error getting context from backend:', error)
      return null
    }
  }

  const getAllContextsFromBackend = async () => {
    try {
      const response = await fetch('/api/context/all')

      if (!response.ok) {
        throw new Error(`Failed to get all contexts: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error getting all contexts from backend:', error)
      return []
    }
  }

  const saveFileWithContext = async () => {
    if (!uploadedFile || !excelData) return

    const fileType = uploadedFile.name.match(/\.csv$/) ? 'csv' : 'excel'
    const sheetNames = Object.keys(excelData)
    const isSingleSheet = sheetNames.length === 1

    // For single sheet files, use sheet context as file context
    const finalFileContext = isSingleSheet
      ? sheetContexts[sheetNames[0]] || ''
      : fileContext

    const fileId = Date.now()
    const newSource = {
      id: fileId,
      name: uploadedFile.name,
      type: fileType,
      size: `${(uploadedFile.size / 1024).toFixed(1)} KB`,
      fileContext: finalFileContext,
      sheetContexts: sheetContexts,
      columnContexts: columnContexts,
      excelData: excelData,
      isSingleSheet: isSingleSheet,
      uploadDate: new Date().toISOString()
    }

    // Prepare context data for backend storage
    const contextData = {
      fileId: fileId,
      fileName: uploadedFile.name,
      fileType: fileType,
      fileSize: `${(uploadedFile.size / 1024).toFixed(1)} KB`,
      uploadDate: new Date().toISOString(),
      isSingleSheet: isSingleSheet,
      fileContext: finalFileContext,
      sheetContexts: sheetContexts,
      columnContexts: columnContexts,
      dataStructure: {
        sheets: Object.keys(excelData).map(sheetName => ({
          name: sheetName,
          rowCount: excelData[sheetName].rowCount,
          columnCount: excelData[sheetName].headers.length,
          headers: excelData[sheetName].headers,
          sampleData: excelData[sheetName].data.slice(0, 5) // Store first 5 rows for context
        }))
      },
      markdownContent: generateMarkdownContent(
        uploadedFile.name,
        fileType,
        `${(uploadedFile.size / 1024).toFixed(1)} KB`,
        isSingleSheet,
        finalFileContext,
        sheetContexts,
        columnContexts,
        excelData
      )
    }

    // Save to backend for LLM use
    const backendResult = await saveContextToBackend(contextData)
    if (backendResult) {
      console.log('Context saved to backend successfully:', backendResult)
      // Add backend ID to source if available
      newSource.backendId = backendResult.id || backendResult._id
    }

    // Generate and download markdown file
    const baseFileName = uploadedFile.name.replace(/\.(xlsx|xls|csv)$/i, '')
    const markdownFileName = `${baseFileName}_context.md`
    downloadMarkdownFile(contextData.markdownContent, markdownFileName)

    setSources(prev => [newSource, ...prev])

    // Reset upload state
    setShowUploadModal(false)
    setUploadedFile(null)
    setFileContext('')
    setExcelData(null)
    setSheetContexts({})
    setColumnContexts({})
    setActiveSheetTab(0)
  }

  const cancelUpload = () => {
    setShowUploadModal(false)
    setUploadedFile(null)
    setFileContext('')
    setExcelData(null)
    setSheetContexts({})
    setColumnContexts({})
    setActiveSheetTab(0)
    setIsProcessingFile(false)
  }

  const cancelUpdate = () => {
    setShowUpdateModal(false)
    setCurrentEditingSource(null)
    setFileContext('')
    setExcelData(null)
    setSheetContexts({})
    setColumnContexts({})
    setActiveSheetTab(0)
  }

  // Source menu actions
  const handleSourceMenuClick = (sourceId, event) => {
    event.stopPropagation()
    setShowSourceMenu(showSourceMenu === sourceId ? null : sourceId)
  }

  const handleRemoveSource = async (sourceId) => {
    const source = sources.find(s => s.id === sourceId)
    if (!source) return

    // Remove from backend if it has a backend ID
    if (source.backendId) {
      try {
        const response = await fetch(`/api/context/${source.id}`, {
          method: 'DELETE'
        })
        if (!response.ok) {
          console.error('Failed to delete from backend:', response.status)
        }
      } catch (error) {
        console.error('Error deleting from backend:', error)
      }
    }

    // Remove from frontend state
    setSources(prev => prev.filter(s => s.id !== sourceId))
    setShowSourceMenu(null)
  }

  const handleUpdateSource = async (sourceId) => {
    const source = sources.find(s => s.id === sourceId)
    if (!source) return

    setCurrentEditingSource(source)
    setShowSourceMenu(null)

    // Load context data for editing
    setFileContext(source.fileContext || '')
    setSheetContexts(source.sheetContexts || {})
    setColumnContexts(source.columnContexts || {})

    // Reconstruct excel data structure for the modal
    if (source.excelData) {
      setExcelData(source.excelData)
    } else {
      // If no excelData, try to reconstruct from backend
      try {
        const backendData = await getContextFromBackend(source.id)
        if (backendData && backendData.dataStructure) {
          const reconstructedData = {}
          backendData.dataStructure.sheets.forEach(sheet => {
            reconstructedData[sheet.name] = {
              headers: sheet.headers,
              data: sheet.sampleData || [],
              rowCount: sheet.rowCount
            }
          })
          setExcelData(reconstructedData)
        }
      } catch (error) {
        console.error('Error loading backend data:', error)
      }
    }

    setActiveSheetTab(0)
    setShowUpdateModal(true)
  }

  const saveUpdatedContext = async () => {
    if (!currentEditingSource || !excelData) return

    const sheetNames = Object.keys(excelData)
    const isSingleSheet = sheetNames.length === 1

    // For single sheet files, use sheet context as file context
    const finalFileContext = isSingleSheet
      ? sheetContexts[sheetNames[0]] || ''
      : fileContext

    // Update the source in frontend state
    const updatedSource = {
      ...currentEditingSource,
      fileContext: finalFileContext,
      sheetContexts: sheetContexts,
      columnContexts: columnContexts,
      uploadDate: new Date().toISOString() // Update timestamp
    }

    // Prepare context data for backend storage
    const contextData = {
      fileId: currentEditingSource.id,
      fileName: currentEditingSource.name,
      fileType: currentEditingSource.type,
      fileSize: currentEditingSource.size,
      uploadDate: new Date().toISOString(),
      isSingleSheet: isSingleSheet,
      fileContext: finalFileContext,
      sheetContexts: sheetContexts,
      columnContexts: columnContexts,
      dataStructure: {
        sheets: Object.keys(excelData).map(sheetName => ({
          name: sheetName,
          rowCount: excelData[sheetName].rowCount,
          columnCount: excelData[sheetName].headers.length,
          headers: excelData[sheetName].headers,
          sampleData: excelData[sheetName].data.slice(0, 5) // Store first 5 rows for context
        }))
      },
      markdownContent: generateMarkdownContent(
        currentEditingSource.name,
        currentEditingSource.type,
        currentEditingSource.size,
        isSingleSheet,
        finalFileContext,
        sheetContexts,
        columnContexts,
        excelData
      )
    }

    // Save to backend
    const backendResult = await saveContextToBackend(contextData)
    if (backendResult) {
      console.log('Updated context saved to backend successfully:', backendResult)
    }

    // Generate and download updated markdown file
    const baseFileName = currentEditingSource.name.replace(/\.(xlsx|xls|csv)$/i, '')
    const markdownFileName = `${baseFileName}_context_updated.md`
    downloadMarkdownFile(contextData.markdownContent, markdownFileName)

    // Update sources state
    setSources(prev => prev.map(source =>
      source.id === currentEditingSource.id ? updatedSource : source
    ))

    // Reset update state
    cancelUpdate()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="app">
      {/* Left Sidebar - Chat History */}
      <div className="sidebar left-sidebar">
        <div className="sidebar-header">
          <h1 className="logo">tottho.ai</h1>
          <button className="new-chat-btn" onClick={createNewChat}>
            <span className="plus-icon">+</span>
            New Chat
          </button>
        </div>

        <div className="chat-list">
          {chats.length === 0 ? (
            <div className="empty-state">
              <p>No chats yet. Create your first chat to get started!</p>
            </div>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                className={`chat-item ${currentChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => setCurrentChat(chat)}
              >
                <span className="chat-icon">💬</span>
                <span className="chat-title">{chat.title}</span>
                <button
                  className="chat-menu"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSettings(true)
                  }}
                >
                  ⋯
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">AM</div>
            <span className="user-name">AI Mahmud</span>
            <button className="user-menu">⋯</button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-content">
        {!currentChat ? (
          <div className="welcome-screen">
            <div className="welcome-content">
              <h2>Welcome to tottho.ai</h2>
              <p>Start a new conversation to begin chatting with AI</p>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-messages">
              {currentChat.messages.length === 0 ? (
                <div className="empty-chat">
                  <div className="ai-avatar">🤖</div>
                  <p>Start your conversation...</p>
                </div>
              ) : (
                currentChat.messages.map(msg => (
                  <div key={msg.id} className={`message ${msg.sender}`}>
                    <div className="message-avatar">
                      {msg.sender === 'user' ? 'You' : '🤖'}
                    </div>
                    <div className="message-content">
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="chat-input-container">
              <div className="chat-input-wrapper">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write your question or query here..."
                  className="chat-input"
                  rows="1"
                />
                <button
                  className="send-button"
                  onClick={sendMessage}
                  disabled={!message.trim() || isLoading}
                >
                  {isLoading ? (
                    <span className="loading-spinner">⟳</span>
                  ) : (
                    <span className="send-icon">→</span>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Sidebar - Sources */}
      <div className="sidebar right-sidebar">
        <div className="sidebar-header">
          <h3>Sources</h3>
          <span className="recent-badge">Recent</span>
        </div>

        <div className="sources-list">
          {sources.length === 0 ? (
            <div className="empty-state">
              <p>No files uploaded yet. Upload files to see them here.</p>
            </div>
          ) : (
            sources.map(source => (
              <div key={source.id} className="source-item">
                <div className="source-icon">
                  {source.type === 'excel' ? '📊' : source.type === 'csv' ? '📋' : '📄'}
                </div>
                <div className="source-info">
                  <span className="source-name">{source.name}</span>
                  <span className="source-size">{source.size}</span>
                </div>
                <div className="source-menu-container">
                  <button
                    className="source-menu"
                    onClick={(e) => handleSourceMenuClick(source.id, e)}
                  >
                    ⋯
                  </button>
                  {showSourceMenu === source.id && (
                    <div className="source-menu-dropdown">
                      <button
                        className="menu-item"
                        onClick={() => handleUpdateSource(source.id)}
                      >
                        📝 Update
                      </button>
                      <button
                        className="menu-item remove"
                        onClick={() => handleRemoveSource(source.id)}
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <button className="add-source-btn" onClick={() => setShowUploadModal(true)}>
          <span className="plus-icon">+</span>
          Add new source
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>AI Provider Settings</h3>
              <button className="close-button" onClick={() => setShowSettings(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Provider Selection */}
              <div className="setting-group">
                <label>AI Provider</label>
                <div className="provider-tabs">
                  <button
                    className={`provider-tab ${selectedProvider === 'gemini' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('gemini')}
                  >
                    Google Gemini
                  </button>
                  <button
                    className={`provider-tab ${selectedProvider === 'openai' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('openai')}
                  >
                    OpenAI
                  </button>
                  <button
                    className={`provider-tab ${selectedProvider === 'ollama' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('ollama')}
                  >
                    Ollama
                  </button>
                </div>
              </div>

              {/* Gemini Settings */}
              {selectedProvider === 'gemini' && (
                <div className="provider-settings">
                  <div className="setting-group">
                    <label htmlFor="gemini-api-key">Gemini API Key</label>
                    <div className="api-key-input-group">
                      <input
                        id="gemini-api-key"
                        type="password"
                        value={apiKeys.gemini}
                        onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
                        placeholder="Enter your Gemini API key"
                        className="api-key-input"
                      />
                      <button
                        className="check-models-btn"
                        onClick={() => checkModelsForProvider('gemini', apiKeys.gemini)}
                        disabled={!apiKeys.gemini || isCheckingModels}
                      >
                        {isCheckingModels ? 'Checking...' : 'Check Models'}
                      </button>
                    </div>
                    <p className="setting-description">
                      Get your API key from{' '}
                      <a
                        href="https://makersuite.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="api-link"
                      >
                        Google AI Studio
                      </a>
                    </p>

                    {availableModels.gemini.length > 0 && (
                      <div className="model-selection">
                        <label htmlFor="gemini-model">Select Model</label>
                        <select
                          id="gemini-model"
                          value={selectedModel.gemini}
                          onChange={(e) => handleModelChange('gemini', e.target.value)}
                          className="model-select"
                        >
                          {availableModels.gemini.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OpenAI Settings */}
              {selectedProvider === 'openai' && (
                <div className="provider-settings">
                  <div className="setting-group">
                    <label htmlFor="openai-api-key">OpenAI API Key</label>
                    <div className="api-key-input-group">
                      <input
                        id="openai-api-key"
                        type="password"
                        value={apiKeys.openai}
                        onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                        placeholder="Enter your OpenAI API key"
                        className="api-key-input"
                      />
                      <button
                        className="check-models-btn"
                        onClick={() => checkModelsForProvider('openai', apiKeys.openai)}
                        disabled={!apiKeys.openai || isCheckingModels}
                      >
                        {isCheckingModels ? 'Checking...' : 'Check Models'}
                      </button>
                    </div>
                    <p className="setting-description">
                      Get your API key from{' '}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="api-link"
                      >
                        OpenAI Platform
                      </a>
                    </p>

                    {availableModels.openai.length > 0 && (
                      <div className="model-selection">
                        <label htmlFor="openai-model">Select Model</label>
                        <select
                          id="openai-model"
                          value={selectedModel.openai}
                          onChange={(e) => handleModelChange('openai', e.target.value)}
                          className="model-select"
                        >
                          {availableModels.openai.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ollama Settings */}
              {selectedProvider === 'ollama' && (
                <div className="provider-settings">
                  <div className="setting-group">
                    <label htmlFor="ollama-url">Ollama Base URL</label>
                    <div className="api-key-input-group">
                      <input
                        id="ollama-url"
                        type="text"
                        value={apiKeys.ollama}
                        onChange={(e) => handleApiKeyChange('ollama', e.target.value)}
                        placeholder="http://localhost:11434"
                        className="api-key-input"
                      />
                      <button
                        className="check-models-btn"
                        onClick={() => checkModelsForProvider('ollama', apiKeys.ollama)}
                        disabled={!apiKeys.ollama || isCheckingModels}
                      >
                        {isCheckingModels ? 'Checking...' : 'Check Models'}
                      </button>
                    </div>
                    <p className="setting-description">
                      Make sure Ollama is running locally. Download from{' '}
                      <a
                        href="https://ollama.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="api-link"
                      >
                        ollama.ai
                      </a>
                    </p>

                    {availableModels.ollama.length > 0 && (
                      <div className="model-selection">
                        <label htmlFor="ollama-model">Select Model</label>
                        <select
                          id="ollama-model"
                          value={selectedModel.ollama}
                          onChange={(e) => handleModelChange('ollama', e.target.value)}
                          className="model-select"
                        >
                          <option value="">Select a model</option>
                          {availableModels.ollama.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Current Configuration Status */}
              <div className="setting-group">
                <div className="config-status">
                  <h4>Current Configuration</h4>
                  <p><strong>Provider:</strong> {selectedProvider}</p>
                  {selectedProvider === 'gemini' && apiKeys.gemini && (
                    <p><strong>Model:</strong> {selectedModel.gemini || 'Not selected'}</p>
                  )}
                  {selectedProvider === 'openai' && apiKeys.openai && (
                    <p><strong>Model:</strong> {selectedModel.openai || 'Not selected'}</p>
                  )}
                  {selectedProvider === 'ollama' && selectedModel.ollama && (
                    <p><strong>Model:</strong> {selectedModel.ollama}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowSettings(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={saveSettings}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={cancelUpload}>
          <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Data File</h3>
              <button className="close-button" onClick={cancelUpload}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {!uploadedFile ? (
                <div className="file-upload-area">
                  <div className="upload-dropzone">
                    <div className="upload-icon">📊</div>
                    <h4>Upload Data File</h4>
                    <p>Select an Excel file (.xlsx, .xls) or CSV file (.csv) to upload</p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="file-input"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="upload-button">
                      Choose File
                    </label>
                  </div>
                </div>
              ) : isProcessingFile ? (
                <div className="processing-state">
                  <div className="loading-spinner">⟳</div>
                  <p>Processing file...</p>
                </div>
              ) : (
                <div className="file-context-form">
                  {/* File Context - Only show for multi-sheet files */}
                  <div className="context-section">
                    <h4>File Information</h4>
                    <div className="file-info">
                      <span className="file-name">{uploadedFile.name}</span>
                      <span className="file-size">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                    </div>

                    {excelData && Object.keys(excelData).length > 1 && (
                      <div className="form-group">
                        <label htmlFor="file-context">File Context</label>
                        <textarea
                          id="file-context"
                          value={fileContext}
                          onChange={(e) => setFileContext(e.target.value)}
                          placeholder="Describe what this data file contains and its overall purpose..."
                          className="context-textarea"
                          rows="3"
                        />
                      </div>
                    )}
                  </div>

                  {/* Sheet Tabs and Context */}
                  {excelData && (
                    <div className="sheets-section">
                      <h4>
                        {Object.keys(excelData).length === 1
                          ? 'Data Configuration'
                          : 'Sheet Configuration'
                        }
                      </h4>

                      {/* Sheet Tabs */}
                      <div className="sheet-tabs">
                        {Object.keys(excelData).map((sheetName, index) => (
                          <button
                            key={sheetName}
                            className={`sheet-tab ${activeSheetTab === index ? 'active' : ''}`}
                            onClick={() => setActiveSheetTab(index)}
                          >
                            {sheetName}
                            <span className="sheet-info">
                              ({excelData[sheetName].rowCount} rows)
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Active Sheet Content */}
                      {Object.keys(excelData).map((sheetName, index) => (
                        activeSheetTab === index && (
                          <div key={sheetName} className="sheet-content">
                            {/* Sheet Context */}
                            <div className="form-group">
                              <label htmlFor={`sheet-context-${index}`}>
                                {Object.keys(excelData).length === 1
                                  ? 'File Description'
                                  : `Sheet Context: ${sheetName}`
                                }
                              </label>
                              <textarea
                                id={`sheet-context-${index}`}
                                value={sheetContexts[sheetName] || ''}
                                onChange={(e) => handleSheetContextChange(sheetName, e.target.value)}
                                placeholder={Object.keys(excelData).length === 1
                                  ? `Describe what this file contains and its purpose...`
                                  : `Describe what the "${sheetName}" sheet contains...`
                                }
                                className="context-textarea"
                                rows={Object.keys(excelData).length === 1 ? "3" : "2"}
                              />
                            </div>

                            {/* Column Contexts */}
                            <div className="columns-section">
                              <h5>Column Descriptions</h5>
                              <div className="columns-grid">
                                {excelData[sheetName].headers.map((header, colIndex) => (
                                  header && (
                                    <div key={colIndex} className="column-context">
                                      <label htmlFor={`col-${index}-${colIndex}`}>
                                        {header}
                                      </label>
                                      <textarea
                                        id={`col-${index}-${colIndex}`}
                                        value={columnContexts[sheetName]?.[header] || ''}
                                        onChange={(e) => handleColumnContextChange(sheetName, header, e.target.value)}
                                        placeholder={`Describe the "${header}" column...`}
                                        className="column-textarea"
                                        rows="2"
                                      />
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>

                            {/* Data Preview */}
                            <div className="data-preview">
                              <h5>Data Preview</h5>
                              <div className="preview-table">
                                <table>
                                  <thead>
                                    <tr>
                                      {excelData[sheetName].headers.map((header, colIndex) => (
                                        <th key={colIndex}>{header}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {excelData[sheetName].data.slice(0, 3).map((row, rowIndex) => (
                                      <tr key={rowIndex}>
                                        {row.map((cell, cellIndex) => (
                                          <td key={cellIndex}>{cell}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {excelData[sheetName].data.length > 3 && (
                                  <p className="preview-note">
                                    Showing first 3 rows of {excelData[sheetName].data.length} total rows
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {uploadedFile && !isProcessingFile && (
              <div className="modal-footer">
                <div className="footer-info">
                  <p className="save-info">
                    💡 Saving will add the file to your sources and automatically download a .md file with all context information.
                  </p>
                </div>
                <div className="footer-buttons">
                  <button className="cancel-btn" onClick={cancelUpload}>
                    Cancel
                  </button>
                  <button
                    className="save-btn"
                    onClick={saveFileWithContext}
                    disabled={
                      excelData && Object.keys(excelData).length === 1
                        ? !sheetContexts[Object.keys(excelData)[0]]?.trim()
                        : !fileContext.trim()
                    }
                  >
                    Save & Generate Context
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Update Context Modal */}
      {showUpdateModal && currentEditingSource && (
        <div className="modal-overlay" onClick={cancelUpdate}>
          <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Context - {currentEditingSource.name}</h3>
              <button className="close-button" onClick={cancelUpdate}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="file-context-form">
                {/* File Context - Only show for multi-sheet files */}
                <div className="context-section">
                  <h4>File Information</h4>
                  <div className="file-info">
                    <span className="file-name">{currentEditingSource.name}</span>
                    <span className="file-size">{currentEditingSource.size}</span>
                  </div>

                  {excelData && Object.keys(excelData).length > 1 && (
                    <div className="form-group">
                      <label htmlFor="file-context-update">File Context</label>
                      <textarea
                        id="file-context-update"
                        value={fileContext}
                        onChange={(e) => setFileContext(e.target.value)}
                        placeholder="Describe what this data file contains and its overall purpose..."
                        className="context-textarea"
                        rows="3"
                      />
                    </div>
                  )}
                </div>

                {/* Sheet Tabs and Context */}
                {excelData && (
                  <div className="sheets-section">
                    <h4>
                      {Object.keys(excelData).length === 1
                        ? 'Data Configuration'
                        : 'Sheet Configuration'
                      }
                    </h4>

                    {/* Sheet Tabs */}
                    {Object.keys(excelData).length > 1 && (
                      <div className="sheet-tabs">
                        {Object.keys(excelData).map((sheetName, index) => (
                          <button
                            key={index}
                            className={`sheet-tab ${activeSheetTab === index ? 'active' : ''}`}
                            onClick={() => setActiveSheetTab(index)}
                          >
                            {sheetName} ({excelData[sheetName].rowCount} rows)
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Active Sheet Content */}
                    {Object.keys(excelData).map((sheetName, index) => (
                      activeSheetTab === index && (
                        <div key={index} className="sheet-content">
                          <div className="sheet-context-section">
                            {/* Sheet Context */}
                            <div className="form-group">
                              <label htmlFor={`sheet-context-update-${index}`}>
                                {Object.keys(excelData).length === 1
                                  ? 'File Description'
                                  : `Sheet Context: ${sheetName}`
                                }
                              </label>
                              <textarea
                                id={`sheet-context-update-${index}`}
                                value={sheetContexts[sheetName] || ''}
                                onChange={(e) => handleSheetContextChange(sheetName, e.target.value)}
                                placeholder={Object.keys(excelData).length === 1
                                  ? `Describe what this file contains and its purpose...`
                                  : `Describe what the "${sheetName}" sheet contains...`
                                }
                                className="context-textarea"
                                rows={Object.keys(excelData).length === 1 ? "3" : "2"}
                              />
                            </div>

                            {/* Column Contexts */}
                            <div className="columns-section">
                              <h5>Column Descriptions</h5>
                              <div className="columns-grid">
                                {excelData[sheetName].headers.map((header, colIndex) => (
                                  header && (
                                    <div key={colIndex} className="column-context">
                                      <label htmlFor={`col-update-${index}-${colIndex}`}>
                                        {header}
                                      </label>
                                      <textarea
                                        id={`col-update-${index}-${colIndex}`}
                                        value={columnContexts[sheetName]?.[header] || ''}
                                        onChange={(e) => handleColumnContextChange(sheetName, header, e.target.value)}
                                        placeholder={`Describe the "${header}" column...`}
                                        className="column-textarea"
                                        rows="2"
                                      />
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <div className="footer-info">
                <p className="save-info">
                  💡 Updating will save changes to backend and download an updated .md file.
                </p>
              </div>
              <div className="footer-buttons">
                <button className="cancel-btn" onClick={cancelUpdate}>
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={saveUpdatedContext}
                  disabled={
                    excelData && Object.keys(excelData).length === 1
                      ? !sheetContexts[Object.keys(excelData)[0]]?.trim()
                      : !fileContext.trim()
                  }
                >
                  Update Context
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
