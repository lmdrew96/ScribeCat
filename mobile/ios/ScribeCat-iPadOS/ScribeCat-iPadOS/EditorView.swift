//
//  EditorView.swift
//  ScribeCat-iPadOS
//
//  Created by ScribeCat Team on 2024.
//  Rich text editor with formatting toolbar and Apple Pencil support
//

import SwiftUI
import UIKit
import PencilKit

struct EditorView: View {
    let theme: AppTheme
    @State private var text: NSAttributedString = NSAttributedString(string: "Start typing your notes here...")
    @State private var showingHandwritingView = false
    @State private var showingFormattingToolbar = true
    @State private var currentFont: UIFont = UIFont.systemFont(ofSize: 16)
    @State private var currentTextColor: UIColor = UIColor.label
    
    var body: some View {
        VStack(spacing: 0) {
            // Formatting Toolbar (similar to desktop app)
            if showingFormattingToolbar {
                FormattingToolbar(
                    theme: theme,
                    currentFont: $currentFont,
                    currentTextColor: $currentTextColor,
                    onFormatAction: handleFormatAction
                )
            }
            
            // Main editor area
            ZStack {
                RichTextEditor(
                    attributedText: $text,
                    theme: theme,
                    font: currentFont,
                    textColor: currentTextColor
                )
                
                // Apple Pencil overlay for handwriting
                if showingHandwritingView {
                    HandwritingView(theme: theme) { handwrittenText in
                        // Convert handwritten text to typed text and append
                        appendText(handwrittenText)
                        showingHandwritingView = false
                    }
                }
            }
            
            // Bottom toolbar with iPad-specific controls
            HStack {
                Button(action: { showingHandwritingView.toggle() }) {
                    Image(systemName: "pencil.tip")
                        .foregroundColor(theme.primaryColor)
                }
                .help("Toggle Apple Pencil handwriting")
                
                Spacer()
                
                Button(action: { showingFormattingToolbar.toggle() }) {
                    Image(systemName: showingFormattingToolbar ? "textformat" : "textformat.size")
                        .foregroundColor(theme.primaryColor)
                }
                .help("Toggle formatting toolbar")
                
                Button(action: saveDocument) {
                    Image(systemName: "square.and.arrow.down")
                        .foregroundColor(theme.primaryColor)
                }
                .help("Save document")
                .keyboardShortcut("s", modifiers: .command)
            }
            .padding()
            .background(theme.surfaceColor)
        }
        .background(theme.backgroundColor)
        .navigationTitle("Rich Text Editor")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            setupKeyboardShortcuts()
        }
    }
    
    private func handleFormatAction(_ action: FormattingAction) {
        // Handle formatting actions like bold, italic, etc.
        switch action {
        case .bold:
            toggleBold()
        case .italic:
            toggleItalic()
        case .underline:
            toggleUnderline()
        case .fontSize(let size):
            changeFontSize(size)
        case .textColor(let color):
            currentTextColor = color
        case .highlight(let color):
            applyHighlight(color)
        case .bulletList:
            insertBulletPoint()
        case .insertTab:
            insertTab()
        }
    }
    
    private func appendText(_ newText: String) {
        let mutableText = NSMutableAttributedString(attributedString: text)
        let newAttributedText = NSAttributedString(
            string: "\n" + newText,
            attributes: [
                .font: currentFont,
                .foregroundColor: currentTextColor
            ]
        )
        mutableText.append(newAttributedText)
        text = mutableText
    }
    
    private func toggleBold() {
        // Implementation for bold toggle
    }
    
    private func toggleItalic() {
        // Implementation for italic toggle
    }
    
    private func toggleUnderline() {
        // Implementation for underline toggle
    }
    
    private func changeFontSize(_ size: CGFloat) {
        currentFont = currentFont.withSize(size)
    }
    
    private func applyHighlight(_ color: UIColor) {
        // Implementation for highlight
    }
    
    private func insertBulletPoint() {
        appendText("• ")
    }
    
    private func insertTab() {
        appendText("\t")
    }
    
    private func saveDocument() {
        // Save document implementation
        print("Saving document...")
    }
    
    private func setupKeyboardShortcuts() {
        // Setup keyboard shortcuts for external keyboards
    }
}

// Rich Text Editor UIViewRepresentable
struct RichTextEditor: UIViewRepresentable {
    @Binding var attributedText: NSAttributedString
    let theme: AppTheme
    let font: UIFont
    let textColor: UIColor
    
    func makeUIView(context: Context) -> UITextView {
        let textView = UITextView()
        textView.font = font
        textView.textColor = textColor
        textView.backgroundColor = UIColor(theme.backgroundColor)
        textView.delegate = context.coordinator
        textView.allowsEditingTextAttributes = true
        textView.isScrollEnabled = true
        textView.textContainerInset = UIEdgeInsets(top: 16, left: 16, bottom: 16, right: 16)
        
        // Enable rich text editing
        textView.typingAttributes = [
            .font: font,
            .foregroundColor: textColor
        ]
        
        return textView
    }
    
    func updateUIView(_ uiView: UITextView, context: Context) {
        if uiView.attributedText != attributedText {
            uiView.attributedText = attributedText
        }
        uiView.font = font
        uiView.textColor = textColor
        uiView.backgroundColor = UIColor(theme.backgroundColor)
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UITextViewDelegate {
        let parent: RichTextEditor
        
        init(_ parent: RichTextEditor) {
            self.parent = parent
        }
        
        func textViewDidChange(_ textView: UITextView) {
            parent.attributedText = textView.attributedText
        }
    }
}

// Formatting Toolbar
struct FormattingToolbar: View {
    let theme: AppTheme
    @Binding var currentFont: UIFont
    @Binding var currentTextColor: UIColor
    let onFormatAction: (FormattingAction) -> Void
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // Font controls
                Group {
                    FormatButton(icon: "bold", theme: theme) {
                        onFormatAction(.bold)
                    }
                    
                    FormatButton(icon: "italic", theme: theme) {
                        onFormatAction(.italic)
                    }
                    
                    FormatButton(icon: "underline", theme: theme) {
                        onFormatAction(.underline)
                    }
                    
                    Divider()
                        .frame(height: 20)
                    
                    // Font size controls
                    Button("14") {
                        onFormatAction(.fontSize(14))
                    }
                    .foregroundColor(theme.primaryColor)
                    
                    Button("16") {
                        onFormatAction(.fontSize(16))
                    }
                    .foregroundColor(theme.primaryColor)
                    
                    Button("18") {
                        onFormatAction(.fontSize(18))
                    }
                    .foregroundColor(theme.primaryColor)
                    
                    Button("24") {
                        onFormatAction(.fontSize(24))
                    }
                    .foregroundColor(theme.primaryColor)
                }
                
                Divider()
                    .frame(height: 20)
                
                // Color controls
                Group {
                    ColorButton(color: .black, theme: theme) {
                        onFormatAction(.textColor(.black))
                    }
                    
                    ColorButton(color: .red, theme: theme) {
                        onFormatAction(.textColor(.red))
                    }
                    
                    ColorButton(color: .blue, theme: theme) {
                        onFormatAction(.textColor(.blue))
                    }
                    
                    ColorButton(color: .green, theme: theme) {
                        onFormatAction(.textColor(.green))
                    }
                }
                
                Divider()
                    .frame(height: 20)
                
                // List and formatting controls
                Group {
                    FormatButton(icon: "list.bullet", theme: theme) {
                        onFormatAction(.bulletList)
                    }
                    
                    FormatButton(icon: "increase.indent", theme: theme) {
                        onFormatAction(.insertTab)
                    }
                    
                    FormatButton(icon: "highlighter", theme: theme) {
                        onFormatAction(.highlight(.yellow))
                    }
                }
            }
            .padding(.horizontal)
        }
        .frame(height: 50)
        .background(theme.surfaceColor)
        .overlay(
            Rectangle()
                .frame(height: 1)
                .foregroundColor(theme.borderColor),
            alignment: .bottom
        )
    }
}

struct FormatButton: View {
    let icon: String
    let theme: AppTheme
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .foregroundColor(theme.primaryColor)
                .font(.system(size: 16))
                .frame(width: 32, height: 32)
                .background(theme.backgroundColor)
                .cornerRadius(6)
        }
    }
}

struct ColorButton: View {
    let color: UIColor
    let theme: AppTheme
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Circle()
                .fill(Color(color))
                .frame(width: 24, height: 24)
                .overlay(
                    Circle()
                        .stroke(theme.borderColor, lineWidth: 1)
                )
        }
    }
}

// Handwriting View using PencilKit
struct HandwritingView: UIViewRepresentable {
    let theme: AppTheme
    let onTextRecognized: (String) -> Void
    
    func makeUIView(context: Context) -> PKCanvasView {
        let canvasView = PKCanvasView()
        canvasView.backgroundColor = UIColor(theme.surfaceColor)
        canvasView.delegate = context.coordinator
        
        // Configure for handwriting
        canvasView.drawingPolicy = .anyInput
        canvasView.tool = PKInkingTool(.pen, color: UIColor(theme.textPrimary), width: 2)
        
        return canvasView
    }
    
    func updateUIView(_ uiView: PKCanvasView, context: Context) {
        // Update if needed
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, PKCanvasViewDelegate {
        let parent: HandwritingView
        
        init(_ parent: HandwritingView) {
            self.parent = parent
        }
        
        func canvasViewDidEndUsingTool(_ canvasView: PKCanvasView) {
            // Here you would implement handwriting recognition
            // For now, we'll simulate it
            parent.onTextRecognized("Handwritten text converted")
        }
    }
}

enum FormattingAction {
    case bold
    case italic
    case underline
    case fontSize(CGFloat)
    case textColor(UIColor)
    case highlight(UIColor)
    case bulletList
    case insertTab
}

struct EditorView_Previews: PreviewProvider {
    static var previews: some View {
        EditorView(theme: .defaultTheme)
            .previewDevice("iPad Pro (12.9-inch) (6th generation)")
    }
}