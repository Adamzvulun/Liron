import sys,subprocess
src,out=sys.argv[1],sys.argv[2]
L=open(src).read().split('\n')
head='\n'.join(L[:39])   # through root div open (line 38) + blank
hud='\n'.join(L[451:])   # from HUD comment
scene=subprocess.run(['node','city.js'],capture_output=True,text=True,check=True).stdout
arena='<div style="position: absolute; left: 250px; top: 262px; padding: 4px 14px; background: linear-gradient(#6B5E52,#4A3F36); border: 2px solid #2A1F18; border-radius: 10px; box-shadow: 0 3px 0 #2A1F18; font-family: Cinzel, serif; font-weight: 700; font-size: 15px; letter-spacing: .08em; color: #EADFCB; opacity: .9">THE ARENA · LOCKED</div>'
# richer HUD materials
hud=hud.replace('background: rgba(28,18,12,.85); border: 3px solid #24160E; border-radius: 14px; box-shadow: 0 5px 0 #24160E','background: linear-gradient(#4E3220, #2A170C); border: 3px solid #24160E; border-radius: 14px; box-shadow: inset 0 0 0 2px #8A5A33, inset 0 3px 0 rgba(255,214,150,.25), 0 5px 0 #24160E, 0 10px 18px rgba(30,12,4,.4)')
hud=hud.replace('background: rgba(28,18,12,.85); border: 3px solid #24160E; border-radius: 999px; box-shadow: 0 4px 0 #24160E','background: linear-gradient(#4E3220, #2A170C); border: 3px solid #24160E; border-radius: 999px; box-shadow: inset 0 0 0 2px #8A5A33, 0 4px 0 #24160E, 0 8px 14px rgba(30,12,4,.4)')
hud=hud.replace('background: #5A341A; border: 4px solid #24160E; border-radius: 16px; box-shadow: inset 0 3px 0 #8A5A33, 0 6px 0 #24160E','background: linear-gradient(#9A6438, #5A341A 55%, #3E200C); border: 4px solid #24160E; border-radius: 16px; box-shadow: inset 0 0 0 3px #C78A3E, inset 0 6px 0 rgba(255,220,160,.35), 0 6px 0 #24160E, 0 14px 24px rgba(30,12,4,.5)')
hud=hud.replace('background: #5A341A; border: 3px solid #24160E; box-shadow: inset 0 3px 0 #8A5A33, 0 4px 0 #24160E','background: linear-gradient(#8A5A33, #4E2C16); border: 3px solid #24160E; box-shadow: inset 0 2px 0 rgba(255,214,150,.45), 0 4px 0 #24160E')
hud=hud.replace('background: rgba(28,18,12,.86); border: 3px solid #24160E; border-radius: 14px; box-shadow: inset 0 0 0 2px #6B4A2E, 0 5px 0 #24160E','background: linear-gradient(rgba(78,50,32,.94), rgba(42,23,12,.94)); border: 3px solid #24160E; border-radius: 14px; box-shadow: inset 0 0 0 2px #8A5A33, 0 5px 0 #24160E, 0 14px 24px rgba(30,12,4,.45)')
hud=hud.replace('background: #E8A93A; box-shadow: inset 0 3px 0 #FFD98A','background: linear-gradient(#FFD98A, #E8A93A 50%, #B07A2A); box-shadow: inset 0 2px 0 #FFF0C0')
hud=hud.replace('background: #F3E2BC; border: 3px solid #24160E; border-radius: 12px; box-shadow: 0 4px 0 #24160E','background: linear-gradient(#FBF1D8, #E6CFA0); border: 3px solid #24160E; border-radius: 12px; box-shadow: inset 0 2px 0 #FFFFFF, 0 4px 0 #24160E, 0 10px 16px rgba(30,12,4,.4)')
open(out,'w').write(head+'\n'+scene+'\n'+arena+'\n\n'+hud)
