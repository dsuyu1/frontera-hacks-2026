# frontera-hacks-2026
Our hackathon project for Frontera Hacks. You can demo the project [here](https://main.d1fqkvr9egy0i4.amplifyapp.com/) for a short time.

# Introduction
The Rio Grande Valley is one of the most politically active, fastest-growing regions in Texas — yet local journalism is fragmented across dozens of small outlets most residents never find. CivicWatch is a civic news aggregator that surfaces, organizes, and contextualizes RGV local news using AI — and gives residents a way to support the outlets keeping democracy accountable.                                                                                                                      
                                                                                                                                                                          
# Problem Statement                                                                                                                                                                                                        
  - Local news deserts are a national crisis. RGV has outlets, but no central discovery layer.                                                                            
  - Residents miss city council votes, school board decisions, local elections.                                                                                           
  - Small outlets struggle for visibility and revenue.                                                                                                                    
  - This is Social Good: informed communities make better civic decisions.                                                                                                
                                                                                                                                                                          
# Using the App
  1. Open the app — land on Today feed, grouped by source domain                                                                                                          
  2. Click an article — slide-in Reader panel opens on the right                                                                                                          
  3. Point out the AI Side Panel — summarizes the article automatically                                                                                                   
  4. Type a question into Ask AI (e.g. "How does this affect local schools?") → Nova Lite answers in real time                                                            
  5. Press J/K to keyboard-navigate between articles                                                                                            
                                                                                                                                                                          
Every article is fetched, parsed, and summarized using Amazon Bedrock's Nova Lite model — lightweight, fast, and cost-effective for our use case.              
                                                                                                                                                                                                                                                                                                                                    
# ML Features                                                                                                                             
                                                                                                                                                                          
  1. Navigate to Trending — show the AI-generated topic clusters                                                                                                          
    - Nova Pro reads all articles ingested that day, clusters them by theme, and writes a human-readable topic card with a description and category. This is unsupervised topic modeling at inference time — no training data needed.                                                                                                
  2. The Segmentation pipeline — articles are auto-categorized (politics, education, public safety, etc.) on ingest using Nova Lite
  3. Navigate to Following feed — show personalized feed                                                                                                                  
    - Once you follow sources, the feed filters to just those outlets using a domain-matching query against our PostgreSQL database. Simple but effective personalization that respects our user intent.                                                                                                                              
                                                            
                                                                                                                                                              
# Local Support feature:                      
                                   
  1. Click Support Local in the sidebar
  2. Search for a topic (e.g. "education" or "border")                                                                                                                    
  3. Show cards appearing with outlet names, descriptions, thumbnails                                                                                                     
    - We scrape DuckDuckGo for local news organizations matching your query, extract their domains, and surface them with OG images. This feature directly connects readers to outlets.                                                                                                                        
            
                                                
# User Features                      
                                                                                                                                                                         
  1. Click Sign in to CivicWatch
  2. After login → Profile → Follow Sources — follow a source                                                                                                             
  3. Followed sources are in the Following feed immediately                                                                                                                     
  4. Feed Folders are in the sidebar where you can create a custom feed                                                                                           
  5. There is also Saved and History tabs                                                                                                                                          
                                                                                                                                                                                                                                                                                                                    
# Architecture                                                                                                                  
                                                                                                                                                                          
  Next.js (Amplify)                                                                                                                                                       
      ↓                                                     
  API Lambda (VPC) ←→ Aurora PostgreSQL                                                                                                                                   
      ↓                                
  Article Lambda (public) → fetches URLs, runs Bedrock Nova                                                                                                               
      ↓                                                     
  AWS Cognito (auth) + S3 (video clips)                                                                                                                                   
  We have Two Lambda functions, one inside the VPC for database queries and one outside to reach external news URLs and Bedrock. Auth via Cognito PKCE. All serverless, all AWS.                                                                                                                                                                    
                                                                                                                                                     
# Closing                                               
Local journalism is infrastructure. CivicWatch lowers the barrier to civic engagement for a community that has historically been overlooked by national media.                                                                                                                                                         
   
Bedrock Nova models power real-time topic clustering, article categorization, and conversational Q&A, making dense civic information accessible to everyone, not just people with time to read.                        
                                                                                                                                                                          
We built this in a weekend for the RGV. With more time, this scales to any underserved local news market in the country.                       


## Fun Stats
- 7 Red Bulls
- 98 AWS Amplify deployments  
- 120 commits
