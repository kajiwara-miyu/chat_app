package models

type Mention struct {
	MessageID       uint `gorm:"primaryKey"` // メッセージID
	MentionTargetID uint `gorm:"primaryKey"` // メンションされたユーザーのID（= user.id）

	// 外部キーの関連
	Message Message `gorm:"foreignKey:MessageID"`
	User    User    `gorm:"foreignKey:MentionTargetID"`
}
