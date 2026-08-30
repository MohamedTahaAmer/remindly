# Why did "model as a service" emerge, and what is AI engineering?

tags: ai-engineering-book

Training LLMs takes data, compute, and specialized talent that only a few organizations can afford — so those organizations sell access to their models as a service. Demand for AI applications went up while the barrier to build them dropped, and building applications on top of readily available models is **AI engineering**, one of the fastest-growing engineering disciplines.

---

## The two consequences of scale

Scaling up AI models post-2020 had two major consequences:

1. **Models became more powerful** — capable of more tasks, enabling more applications and more people to create value with AI.
2. **Only a few organizations can train them** — the data, compute, and talent requirements concentrated model training, which produced *model as a service*: anyone can build on these models without investing in training one.

## AI apps aren't new — the access model is

AI powered applications long before LLMs: product recommendations, fraud detection, churn prediction. Many productionization principles carry over. What changed is that you no longer need to build the model — you build *on top of* one.

===

# What is a language model, and why is it called "generative"?

tags: ai-engineering-book

A language model encodes statistical information about one or more languages: how likely a token is to appear in a given context ("My favorite color is __" → "blue", not "car"). It works as a **completion machine** — given a prompt, it predicts a continuation. Because its fixed, finite vocabulary can construct infinite open-ended outputs, it's called *generative*.

---

## Old statistics, new scale

The statistical nature of language was exploited long before deep learning: Sherlock Holmes decoding the dancing-men cipher via letter frequency (E is the most common English letter), and Claude Shannon's 1951 paper "Prediction and Entropy of Printed English", whose concepts — including entropy — are still used in language modeling today.

## Completions are predictions

A completion is a probabilistic prediction, not a guaranteed-correct answer. That's what makes language models both exciting and frustrating: "To be or not to be" → ", that is the question." works — but nothing forces the continuation to be true.

===

# Why do language models use tokens instead of words or characters?

tags: ai-engineering-book

Three reasons: tokens break words into **meaningful components** ("cooking" → "cook" + "ing"); there are **fewer unique tokens than unique words**, so the vocabulary is smaller and the model more efficient; and tokens let the model **process unknown words** ("chatgpting" → "chatgpt" + "ing"). Tokens balance having fewer units than words while retaining more meaning than characters.

---

## Tokenization

Breaking text into tokens is *tokenization*, and the method is decided by the model developers. GPT-4 splits "I can't wait to build AI applications" into nine tokens — "can't" becomes `can` + `'t`. For non-English languages, a single Unicode character can even map to multiple tokens.

===

# Masked vs. autoregressive language models — what's the difference?

tags: ai-engineering-book

A **masked** language model predicts missing tokens anywhere in a sequence using context from *both sides* — fill-in-the-blank ("My favorite __ is blue" → "color"); BERT is the classic example, used for non-generative tasks like sentiment analysis, classification, and code debugging. An **autoregressive** language model predicts the *next* token using only *preceding* tokens, generating one token after another — it's the model of choice for text generation, and "language model" usually means autoregressive.

---

## Notes

- Autoregressive models are also called **causal** language models.
- Masked models shine where understanding the *whole* context matters — e.g. debugging code, where the model needs both the preceding and following lines to spot the error.
- Technically a masked model like BERT can generate text too, "if you try really hard" — but nobody does.

===

# If completion is so powerful, why isn't a raw language model a chatbot?

tags: ai-engineering-book

Many tasks can be framed as completion — translation ("How are you in French is …" → "Comment ça va"), summarization, coding, math, even spam classification ("Question: Is this email likely spam? … Answer:" → "Likely spam"). But **completion isn't conversation**: ask a completion machine a question and it may continue with *another question* instead of answering. Post-training is what makes a model respond appropriately to a user's request.

---

## The framing trick

The power comes from prompt framing: you shape the text so that the most likely continuation *is* the answer you want. That one mechanism turns a single model into a translator, a summarizer, and a classifier — no task-specific training required.

===

# Why did language models — not other ML models — cause the ChatGPT moment?

tags: ai-engineering-book

**Self-supervision.** Most ML models need supervision — expensive, slow, human-labeled data. Language models infer labels from the input itself: every text sequence supplies both the contexts and the next tokens to predict. Since text is everywhere (books, blogs, articles, Reddit), training data scales massively — which is what let language models scale up into LLMs.

---

## What supervision costs

The 2010s successes were supervised — AlexNet (2012) learned from over 1 million ImageNet images labeled into 1,000 categories. At 5¢ per label that's $50,000 for one pass; double it to cross-check quality; $50M to scale to 1 million categories. And everyday objects are the *cheap* case — Latin translations cost more, and labeling CT scans for cancer would be astronomical.

## How self-supervision sidesteps it

The sentence "I love street food." alone yields six training samples — each prefix is a context, each next token is a label. No human labeling anywhere.

## Self-supervised ≠ unsupervised

In self-supervised learning, labels are **inferred from the input data**. In unsupervised learning, you don't need labels at all.

===

# What do the &lt;BOS&gt; and &lt;EOS&gt; markers do in language-model training?

tags: ai-engineering-book

They mark the **beginning** and **end of a sequence**, letting a model be trained on multiple sequences; each marker is typically one special token. The end-of-sequence marker matters most: it's how the model learns **when to stop responding** — similar to how it's important for humans to know when to stop talking.

===

# How is a language model's size measured, and how has "large" drifted?

tags: ai-engineering-book

By its **number of parameters** — the variables updated during training. In general (though not always), more parameters means more capacity to learn. The bar for "large" keeps moving: GPT-1 (June 2018) at **117 million** parameters was large; GPT-2 (Feb 2019) at **1.5 billion** made 117M small; today **~100 billion** is large — and one day that may be small too. "LLM" is not a scientific term.

===

# Why do larger models need more training data?

tags: ai-engineering-book

Larger models have **more capacity to learn**, so they need more data to maximize their performance. You *can* train a large model on a small dataset — it just wastes compute: a smaller model would achieve similar or better results on that dataset.

===

# Roughly how do GPT-4 tokens map to words, and what is a model's vocabulary?

tags: ai-engineering-book

An average GPT-4 token is about **¾ of a word**, so 100 tokens ≈ 75 words. A model's **vocabulary** is the set of all tokens it can work with — a small set of tokens composes a huge number of distinct words, like letters compose words. Mixtral 8x7B's vocabulary is **32,000** tokens; GPT-4's is **100,256**. Both the tokenization method and the vocabulary size are chosen by the model developers.
